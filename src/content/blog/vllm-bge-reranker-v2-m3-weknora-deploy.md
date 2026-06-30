---
title: "使用 vLLM 部署 BAAI/bge-reranker-v2-m3，并接入本地 WeKnora"
excerpt: "记录一次把 BAAI/bge-reranker-v2-m3 部署成 vLLM reranker 服务，并让本地 WeKnora 通过 HTTP API 调用的完整过程，包括显存、镜像源、模型下载和接口验证。"
pubDate: 2026-06-27
category: "RAG工程"
section: "AI工程"
tags:
  - "AI"
  - "RAG"
  - "vLLM"
  - "WeKnora"
  - "BGE"
  - "ReRank"
  - "Docker"
color: "cyan"
icon: "ServerCog"
minutes: 12
views: 0
comments: 0
draft: false
---

最近在调研 WeKnora 的知识库问答效果时，发现重排模型是一个比较关键的环节。

普通向量召回只负责从知识库里找出一批“看起来相似”的文本片段，但这些片段不一定真的适合回答当前问题。Reranker 的作用就是对这些候选片段重新打分，把更相关的片段排到前面，再交给大模型生成答案。

这次我选择部署的是：

```text
BAAI/bge-reranker-v2-m3
```

部署方式是：

```text
服务器上单独部署 vLLM reranker 服务
本地 WeKnora 通过 HTTP API 调用远程 reranker
```

最终接口地址类似：

```text
http://服务器IP:18082/v1/rerank
```

本文记录完整部署过程，以及中间踩到的几个坑。

---

## 一、部署目标

我的目标不是把 reranker 和 WeKnora 部署在同一台机器上，而是：

```text
GPU 服务器：只负责运行 reranker 服务
本地 WeKnora：通过 API 调用远程 reranker
```

所以整体结构是：

```text
本地 WeKnora
   |
   | HTTP
   v
GPU 服务器 vLLM Reranker
   |
   v
BAAI/bge-reranker-v2-m3
```

这样做的好处是：

1. 本地机器不用占 GPU；
2. WeKnora 可以继续本地开发；
3. reranker 可以独立维护；
4. 后续如果换模型，只需要调整服务器侧服务。

---

## 二、服务器环境

服务器环境大致如下：

```text
系统：Alibaba Cloud Linux 3
GPU：Tesla T4 16GB
Docker：26.1.3
Docker Compose：v2.27.0
NVIDIA Driver：590.48.01
CUDA：13.1
vLLM 镜像：vllm/vllm-openai:latest，对应 vLLM 0.24.0
```

先检查 GPU：

```bash
nvidia-smi
```

再检查 Docker：

```bash
docker --version
docker compose version
```

如果普通用户没有 Docker 权限，需要用 `sudo docker`。

验证 Docker 容器里能否访问 GPU：

```bash
sudo docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

只要这条命令能正常看到 GPU，说明 Docker GPU runtime 基本没问题。

---

## 三、先释放 GPU 显存

这台服务器原来已经跑了一个 GLM-OCR 的 vLLM 容器，占用了大量显存。

查看显存：

```bash
nvidia-smi
```

当时能看到 T4 16GB 基本已经满了，主要被已有的 `glm-ocr-vllm` 占用。

所以先停掉旧的 OCR vLLM 容器：

```bash
sudo docker stop glm-ocr-vllm
```

再次检查显存：

```bash
nvidia-smi
```

显存释放之后，再部署 reranker。

这里有一个经验：
**同一张 16GB T4 上，不建议同时跑 GLM-OCR vLLM + reranker + 其他 GPU 服务。**

如果要长期共存，建议升级到：

```text
最低：24GB 显存
推荐：32GB 显存
更省心：48GB 显存
```

---

## 四、第一次尝试：直接用 vLLM 镜像启动

一开始我直接用下面的方式启动：

```bash
sudo docker run -d \
  --name WeKnora-vllm-reranker \
  --gpus all \
  --restart unless-stopped \
  -p 18082:8000 \
  -v vllm_hf_cache:/root/.cache/huggingface \
  -e HF_HOME=/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  BAAI/bge-reranker-v2-m3 \
  --served-model-name BAAI/bge-reranker-v2-m3 \
  --pooler-config.task classify \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype half
```

几个关键参数解释：

```bash
--name WeKnora-vllm-reranker
```

指定容器名称，方便后续查看日志、重启、删除。

```bash
--gpus all
```

允许容器使用 GPU。

```bash
--restart unless-stopped
```

服务器重启后自动拉起容器，除非手动 stop。

```bash
-p 18082:8000
```

宿主机 `18082` 端口映射到容器内 `8000` 端口。
所以外部访问地址是：

```text
http://服务器IP:18082
```

```bash
-v vllm_hf_cache:/root/.cache/huggingface
```

把 Hugging Face 模型缓存放到 Docker volume，避免容器删除后重新下载。

```bash
BAAI/bge-reranker-v2-m3
```

这是要加载的模型。

```bash
--served-model-name BAAI/bge-reranker-v2-m3
```

指定对外暴露的模型名。后面请求 `/v1/rerank` 时，JSON 里的 `model` 要和它一致。

```bash
--pooler-config.task classify
```

这是这次部署的关键参数。
vLLM 0.24.0 中，这个 reranker 会被识别为 `XLMRobertaForSequenceClassification`，并以 pooling/classify 方式启动。

```bash
--dtype half
```

使用 FP16，降低显存占用。T4 上不建议用 BF16。

---

## 五、第一个坑：Hugging Face 网络不可达

第一次启动后查看日志：

```bash
sudo docker logs -f WeKnora-vllm-reranker
```

报错类似：

```text
Network is unreachable
requesting HEAD https://huggingface.co/BAAI/bge-reranker-v2-m3/resolve/main/config.json
```

也就是说容器访问 Hugging Face 失败，导致模型配置文件 `config.json` 下载不了。

解决方式是加镜像源：

```bash
-e HF_ENDPOINT=https://hf-mirror.com
```

也就是：

```bash
sudo docker run -d \
  --name WeKnora-vllm-reranker \
  --gpus all \
  --restart unless-stopped \
  --ipc=host \
  -p 18082:8000 \
  -v vllm_hf_cache:/root/.cache/huggingface \
  -e HF_HOME=/root/.cache/huggingface \
  -e HF_ENDPOINT=https://hf-mirror.com \
  vllm/vllm-openai:latest \
  BAAI/bge-reranker-v2-m3 \
  --served-model-name BAAI/bge-reranker-v2-m3 \
  --pooler-config.task classify \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype half
```

这里还加了：

```bash
--ipc=host
```

这是 vLLM Docker 部署里常用的参数，可以避免容器共享内存不足导致的问题。

---

## 六、第二个坑：不要写 `--device auto`

一开始我还写过：

```bash
--device auto
```

结果 vLLM 0.24.0 把 `auto` 当成了 GPU ID 去解析，最后报错：

```text
ValueError: invalid literal for int() with base 10: 'auto'
NVMLError_NotFound: Not Found
```

解决方式很简单：
**直接删掉 `--device auto`。**

只要 Docker 已经通过：

```bash
--gpus all
```

把 GPU 暴露给容器，vLLM 会自己识别 CUDA 设备。

---

## 七、第三个坑：vLLM 默认想预留 92% 显存

后面模型能解析了，但又报显存错误：

```text
Free memory on device cuda:0 (11.23/14.56 GiB) on startup is less than desired GPU memory utilization (0.92, 13.4 GiB).
Decrease GPU memory utilization or reduce GPU memory used by other processes.
```

这不是模型本身一定需要 13GB，而是 vLLM 默认按 `0.92` 的比例规划 GPU 显存。

当前服务器还有其他 GPU 进程，所以剩余显存只有 11GB 左右，不够 vLLM 默认预留。

解决方式是降低显存预留比例：

```bash
--gpu-memory-utilization 0.65
```

完整启动命令：

```bash
sudo docker run -d \
  --name WeKnora-vllm-reranker \
  --gpus all \
  --restart unless-stopped \
  --ipc=host \
  -p 18082:8000 \
  -v vllm_hf_cache:/root/.cache/huggingface \
  -e HF_HOME=/root/.cache/huggingface \
  -e HF_ENDPOINT=https://hf-mirror.com \
  vllm/vllm-openai:latest \
  BAAI/bge-reranker-v2-m3 \
  --served-model-name BAAI/bge-reranker-v2-m3 \
  --pooler-config.task classify \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype half \
  --gpu-memory-utilization 0.65
```

---

## 八、第四个坑：容器一直 running，但 API 不可用

有一次容器状态是 running：

```bash
sudo docker ps -a | grep WeKnora-vllm-reranker
```

但是访问健康检查：

```bash
curl -sS -m 5 -i http://127.0.0.1:18082/health
```

返回：

```text
Recv failure: Connection reset by peer
```

这说明端口上有进程，但 vLLM API 还没有真正 ready。

进一步看状态：

```bash
sudo docker stats --no-stream WeKnora-vllm-reranker
```

发现 CPU 几乎不动，内存也只有几百 MB。再看缓存：

```bash
du -sh /root/.cache/huggingface
```

只有几十 MB。

这说明模型权重没有完整下载，vLLM 卡在初始化阶段。

最终采用更稳的方式：**先手工下载模型到宿主机目录，再让 vLLM 从本地路径加载。**

---

## 九、推荐方式：先下载模型，再本地加载

创建模型目录：

```bash
sudo mkdir -p /data/models/bge-reranker-v2-m3
sudo chown -R jms:jms /data/models/bge-reranker-v2-m3
```

注意，`vllm/vllm-openai` 镜像默认 entrypoint 是 `vllm`，所以如果直接写：

```bash
vllm/vllm-openai:latest bash -lc '...'
```

会被当成 vLLM 子命令执行。

正确方式是覆盖 entrypoint：

```bash
sudo docker run --rm -it \
  --entrypoint bash \
  --network host \
  -v /data/models/bge-reranker-v2-m3:/models/bge-reranker-v2-m3 \
  -e HF_ENDPOINT=https://hf-mirror.com \
  -e HF_HUB_DISABLE_XET=1 \
  vllm/vllm-openai:latest \
  -lc 'hf download BAAI/bge-reranker-v2-m3 --local-dir /models/bge-reranker-v2-m3'
```

这里有几个重点：

```bash
--entrypoint bash
```

让容器真正执行 bash，而不是执行默认的 vLLM entrypoint。

```bash
--network host
```

下载模型时直接使用宿主机网络。

```bash
-e HF_ENDPOINT=https://hf-mirror.com
```

走 Hugging Face 镜像源。

```bash
-e HF_HUB_DISABLE_XET=1
```

禁用 Xet 下载机制，减少网络环境不稳定时卡住的概率。

```bash
hf download BAAI/bge-reranker-v2-m3 --local-dir /models/bge-reranker-v2-m3
```

使用新版 `hf` 命令下载模型。
新版镜像里 `huggingface-cli` 已经提示废弃，应该使用 `hf download`。

下载完成后，我这里显示：

```text
13 files
2.29G/2.29G
Download complete
```

检查模型目录：

```bash
ls -lh /data/models/bge-reranker-v2-m3
du -sh /data/models/bge-reranker-v2-m3
find /data/models/bge-reranker-v2-m3 -maxdepth 2 -type f | sort
```

正常应该能看到类似：

```text
config.json
model.safetensors
tokenizer.json
tokenizer_config.json
sentencepiece.bpe.model
```

---

## 十、最终启动命令

模型下载完成后，从本地目录启动：

```bash
sudo docker rm -f WeKnora-vllm-reranker 2>/dev/null || true

sudo docker run -d \
  --name WeKnora-vllm-reranker \
  --gpus all \
  --restart unless-stopped \
  --ipc=host \
  -p 18082:8000 \
  -v /data/models/bge-reranker-v2-m3:/models/bge-reranker-v2-m3:ro \
  vllm/vllm-openai:latest \
  /models/bge-reranker-v2-m3 \
  --served-model-name BAAI/bge-reranker-v2-m3 \
  --pooler-config.task classify \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype half \
  --gpu-memory-utilization 0.65
```

这次不再让 vLLM 在线下载模型，而是从：

```text
/models/bge-reranker-v2-m3
```

加载本地模型。

宿主机目录是：

```text
/data/models/bge-reranker-v2-m3
```

容器内只读挂载：

```bash
-v /data/models/bge-reranker-v2-m3:/models/bge-reranker-v2-m3:ro
```

---

## 十一、启动成功日志

查看日志：

```bash
sudo docker logs -f WeKnora-vllm-reranker
```

成功后可以看到类似：

```text
Supported tasks: ['classify', 'token_classify']
Starting vLLM server on http://0.0.0.0:8000
Route: /v1/models, Methods: GET
Route: /rerank, Methods: POST
Route: /v1/rerank, Methods: POST
Route: /v2/rerank, Methods: POST
Application startup complete.
```

这几个信息很关键：

```text
/v1/rerank 路由存在
vLLM 服务启动完成
模型以 classify 任务方式加载成功
```

---

## 十二、验证接口

### 1. 健康检查

```bash
curl -sS -i http://127.0.0.1:18082/health
```

预期：

```text
HTTP/1.1 200 OK
```

### 2. 查看模型列表

```bash
curl -sS http://127.0.0.1:18082/v1/models
```

返回中应该能看到：

```json
{
  "id": "BAAI/bge-reranker-v2-m3",
  "root": "/models/bge-reranker-v2-m3",
  "max_model_len": 8192
}
```

这说明服务端模型名是：

```text
BAAI/bge-reranker-v2-m3
```

后续 WeKnora 配置里的模型名必须和它一致。

### 3. 测试 rerank

```bash
curl -sS http://127.0.0.1:18082/v1/rerank \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer local-vllm' \
  -d '{
    "model": "BAAI/bge-reranker-v2-m3",
    "query": "WeKnora 是什么",
    "documents": [
      "WeKnora 是一个知识库问答和 RAG 系统。",
      "今天上海天气晴朗。",
      "bge-reranker-v2-m3 是一个跨编码器重排模型。"
    ],
    "return_documents": true
  }'
```

实际返回类似：

```json
{
  "id": "score-a24ae928d7467ad5",
  "model": "BAAI/bge-reranker-v2-m3",
  "usage": {
    "prompt_tokens": 72,
    "total_tokens": 72
  },
  "results": [
    {
      "index": 0,
      "document": {
        "text": "WeKnora 是一个知识库问答和 RAG 系统。",
        "multi_modal": null
      },
      "relevance_score": 0.9996455907821655
    },
    {
      "index": 2,
      "document": {
        "text": "bge-reranker-v2-m3 是一个跨编码器重排模型。",
        "multi_modal": null
      },
      "relevance_score": 0.0003760864201467484
    },
    {
      "index": 1,
      "document": {
        "text": "今天上海天气晴朗。",
        "multi_modal": null
      },
      "relevance_score": 0.0000161083517014049
    }
  ]
}
```

这个排序是符合预期的。

对于问题：

```text
WeKnora 是什么
```

最相关的是：

```text
WeKnora 是一个知识库问答和 RAG 系统。
```

天气这条被排到最后。

说明 reranker 正常工作。

---

## 十三、本地 WeKnora 配置

因为 reranker 服务部署在远程服务器，WeKnora 只需要调用 HTTP API。

配置如下：

```text
RERANK_MODEL_NAME=BAAI/bge-reranker-v2-m3
RERANK_BASE_URL=http://服务器IP:18082/v1
RERANK_API_KEY=local-vllm
RERANK_PROVIDER=generic
```

比如：

```text
RERANK_MODEL_NAME=BAAI/bge-reranker-v2-m3
RERANK_BASE_URL=http://10.72.95.168:18082/v1
RERANK_API_KEY=local-vllm
RERANK_PROVIDER=generic
```

注意：

```text
RERANK_BASE_URL 要写到 /v1
```

因为 WeKnora 通常会请求：

```text
${RERANK_BASE_URL}/rerank
```

所以最终路径会变成：

```text
http://10.72.95.168:18082/v1/rerank
```

如果 WeKnora 有 SSRF 白名单，还需要加服务器 IP：

```text
SSRF_WHITELIST=10.72.95.168
```

如果本地 WeKnora 是 Docker 容器，还要确认容器内部能访问服务器：

```bash
curl -sS -i http://10.72.95.168:18082/health
```

---

## 十四、常用维护命令

查看容器：

```bash
sudo docker ps -a | grep WeKnora-vllm-reranker
```

查看日志：

```bash
sudo docker logs -f WeKnora-vllm-reranker
```

查看最近日志：

```bash
sudo docker logs --tail=120 WeKnora-vllm-reranker
```

查看 GPU：

```bash
nvidia-smi
```

停止 reranker：

```bash
sudo docker stop WeKnora-vllm-reranker
```

启动 reranker：

```bash
sudo docker start WeKnora-vllm-reranker
```

删除 reranker 容器：

```bash
sudo docker rm -f WeKnora-vllm-reranker
```

因为启动时加了：

```bash
--restart unless-stopped
```

所以服务器重启后，reranker 容器会自动启动。

---

## 十五、这次踩坑总结

### 1. Docker 需要 sudo 权限

普通用户执行：

```bash
docker run ...
```

可能报：

```text
permission denied while trying to connect to the Docker daemon socket
```

解决：

```bash
sudo docker ...
```

或者把用户加入 docker 组。

---

### 2. GPU 显存要先看清楚

部署前一定先执行：

```bash
nvidia-smi
```

如果显存已经被其他服务占满，reranker 起不来。

这次 T4 16GB 上原本已有 GLM-OCR vLLM，占了 11GB 以上，必须先停掉。

---

### 3. vLLM 0.24 不要写 `--device auto`

`--device auto` 可能被当成 GPU ID 解析，导致：

```text
NVMLError_NotFound
```

直接删掉即可。

---

### 4. 网络不稳定时，不要依赖 vLLM 启动时自动下载模型

更稳的方式是：

```text
先 hf download 到宿主机
再从本地目录启动 vLLM
```

这比让 vLLM 边启动边下载稳定很多。

---

### 5. `huggingface-cli` 已废弃，使用 `hf download`

新版镜像里会提示：

```text
huggingface-cli is deprecated
Use hf instead
```

所以下载命令应该写：

```bash
hf download BAAI/bge-reranker-v2-m3 --local-dir /models/bge-reranker-v2-m3
```

---

### 6. `vllm/vllm-openai` 镜像默认 entrypoint 是 vLLM

如果要在镜像里执行 bash，需要加：

```bash
--entrypoint bash
```

否则命令可能会被当成 vLLM 子命令解析。

---

### 7. 显存预留比例需要调低

vLLM 默认 `gpu_memory_utilization` 约为 `0.92`，在已有其他 GPU 进程时容易失败。

可以改成：

```bash
--gpu-memory-utilization 0.65
```

如果还不够，可以继续降到：

```bash
--gpu-memory-utilization 0.55
```

---

## 十六、最终结论

这次最终成功的方案是：

```text
手工下载 BAAI/bge-reranker-v2-m3 到 /data/models
用 vLLM 从本地目录加载模型
通过 18082 端口暴露 /v1/rerank
本地 WeKnora 配置远程 RERANK_BASE_URL
```

最终服务地址：

```text
http://服务器IP:18082/v1/rerank
```

最终模型名：

```text
BAAI/bge-reranker-v2-m3
```

最终 WeKnora 配置：

```text
RERANK_MODEL_NAME=BAAI/bge-reranker-v2-m3
RERANK_BASE_URL=http://服务器IP:18082/v1
RERANK_API_KEY=local-vllm
RERANK_PROVIDER=generic
```

部署完成后，WeKnora 的检索链路就变成：

```text
用户问题
  -> 向量召回 TopN 文档片段
  -> bge-reranker-v2-m3 重新打分排序
  -> 选出更相关的上下文
  -> LLM 生成最终答案
```

从工程角度看，Reranker 不是“让大模型更聪明”，而是让大模型拿到的上下文更准。
对于知识库问答和 RAG 系统来说，这一步很值得单独部署。
