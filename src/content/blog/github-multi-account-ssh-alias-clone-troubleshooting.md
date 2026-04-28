---
title: "GitHub 多账号 SSH 配置踩坑：为什么复制的 SSH 地址 clone 不下来？"
excerpt: "记录一次 GitHub 多账号与 SSH 配置下的 clone 失败排查：如何确认实际使用的 key、为什么默认 SSH 地址不一定可用，以及如何用 Host 别名稳定解决。"
pubDate: 2026-04-28
category: "技术"
section: "技术专栏"
tags:
  - GitHub
  - Git
  - SSH
  - 多账号
  - macOS
color: "purple"
icon: "🔐"
minutes: 9
views: 0
comments: 0
draft: false
---

很多人本地同时配置了公司 GitLab、个人 GitHub，甚至多个 GitHub 账号。平时看起来都能用，一旦换网络、换仓库、换 SSH Key，就很容易出现“明明认证成功，但 clone 还是失败”的情况。

这篇文章记录一次从问题出现、逐步排查到最终解决的过程，重点讲清楚：SSH 到底用了哪个 key、为什么 GitHub 复制的 SSH 链接不一定能直接用、以及多账号下应该怎么配置。

---

## 一、问题背景

当前本地目录是：

```text
/Users/xxx/Desktop/sturdy-potato
```

我想把 GitHub 上的项目拉下来：

```bash
git@github.com:sturdy-potato/vercel-lab-api.git
```

本机之前已经配置过 SSH，而且执行测试命令时能认证成功：

```bash
ssh -T git@github.com
```

返回：

```text
Hi sturdy-potato! You've successfully authenticated, but GitHub does not provide shell access.
```

这说明 GitHub 账号认证本身是成功的。

但问题在于：我本机配置过多个 SSH 账号，不确定命令行到底用了哪个 key。后来又遇到从 GitHub 页面复制 SSH 地址后，执行 clone 报错：

```bash
git clone git@github.com:sturdy-potato/zhuwei-blog.git
```

报错信息：

```text
Connection closed by xxx.xxx.xxx.xxx port 22
fatal: Could not read from remote repository.
Please make sure you have the correct access rights
and the repository exists.
```

这就不是简单的“仓库不存在”或者“权限不对”了。

---

## 二、第一步：确认 SSH 实际用了哪个 key

当机器上有多个 SSH Key 时，不能只看“认证成功”，还要看具体用了哪个私钥文件。

可以执行：

```bash
ssh -vT git@github.com 2>&1 | grep -E "Offering public key|Authenticated|Hi "
```

输出类似：

```text
debug1: Offering public key: /Users/xxx/.ssh/id_ed25519_sturdy ED25519 SHA256:xxxx explicit
Authenticated to ssh.github.com ([xxx.xxx.xxx.xxx]:443) using "publickey".
Hi sturdy-potato! You've successfully authenticated, but GitHub does not provide shell access.
```

这里有两个关键信息。

第一，实际使用的 key 是：

```text
/Users/xxx/.ssh/id_ed25519_sturdy
```

第二，认证到的 GitHub 账号是：

```text
sturdy-potato
```

所以可以确认：当前 `git@github.com` 使用的是 `id_ed25519_sturdy`，并且这个 key 对应的是 `sturdy-potato` 账号。

---

## 三、第二步：查看 SSH 配置

继续查看本机 SSH 配置：

```bash
cat ~/.ssh/config
```

当时配置大致如下（敏感信息已脱敏）：

```sshconfig
Host gitlab.example.com
  HostName gitlab.example.com
  Port 58422
  User git
  IdentityFile ~/.ssh/id_ed25519

Host github.com-sturdy
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519_sturdy
  IdentitiesOnly yes

Host github.com
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/id_ed25519_sturdy
  IdentitiesOnly yes
```

这里其实有两个 GitHub 配置：

- `Host github.com-sturdy`
- `Host github.com`

它们都指向同一个 key：

```text
IdentityFile ~/.ssh/id_ed25519_sturdy
```

这会造成一个问题：短期看能用，但长期维护容易混乱。

如果后面再加第二个 GitHub 账号，就很难一眼看出哪个仓库走哪个账号。

---

## 四、第三步：重新整理 SSH 配置

为了避免混乱，决定把 GitHub 相关配置删掉，重新从 0 配置。

先备份原配置：

```bash
cp ~/.ssh/config ~/.ssh/config.bak.$(date +%Y%m%d_%H%M%S)
```

然后编辑配置文件：

```bash
nano ~/.ssh/config
```

保留公司 GitLab 配置：

```sshconfig
Host gitlab.example.com
  HostName gitlab.example.com
  Port 58422
  User git
  IdentityFile ~/.ssh/id_ed25519
```

新增一个明确的 GitHub 账号别名：

```sshconfig
Host github-sturdy
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519_sturdy
  IdentitiesOnly yes
```

最终配置类似：

```sshconfig
Host gitlab.example.com
  HostName gitlab.example.com
  Port 58422
  User git
  IdentityFile ~/.ssh/id_ed25519

Host github-sturdy
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519_sturdy
  IdentitiesOnly yes
```

这里的关键是：

```text
Host github-sturdy
```

它不是 GitHub 官方域名，而是自己定义的 SSH 别名。

以后只要使用 `github-sturdy`，SSH 就会自动按照这段配置去连接 `ssh.github.com:443`，并使用 `~/.ssh/id_ed25519_sturdy`。

---

## 五、第四步：测试新的 SSH 别名

配置完成后，不再测试：

```bash
ssh -T git@github.com
```

而是测试新的别名：

```bash
ssh -T github-sturdy
```

正常返回：

```text
Hi sturdy-potato! You've successfully authenticated, but GitHub does not provide shell access.
```

如果想看它到底用了哪个 key，可以执行：

```bash
ssh -vT github-sturdy 2>&1 | grep -E "Offering public key|Authenticated|Hi "
```

正常会看到类似：

```text
Offering public key: /Users/xxx/.ssh/id_ed25519_sturdy
Authenticated to ssh.github.com
Hi sturdy-potato!
```

这就说明新的别名配置生效了。

---

## 六、真正的坑：GitHub 复制出来的 SSH 地址为什么不行？

GitHub 页面上复制出来的 SSH 地址一般是这种格式：

```bash
git@github.com:sturdy-potato/zhuwei-blog.git
```

直接执行：

```bash
git clone git@github.com:sturdy-potato/zhuwei-blog.git
```

报错：

```text
Connection closed by xxx.xxx.xxx.xxx port 22
fatal: Could not read from remote repository.
```

关键在这句：

```text
port 22
```

这说明当前连接的是 `github.com:22`。

而前面配置的新别名是：

```sshconfig
Host github-sturdy
  HostName ssh.github.com
  Port 443
```

也就是说，只有使用 `github-sturdy` 这个别名时，才会走 `ssh.github.com:443`。

如果直接使用 GitHub 默认地址 `git@github.com:...`，就会匹配 `github.com`。如果本地没有配置 `Host github.com`，它就会走默认 SSH 端口 22。

而在某些网络环境下，GitHub 的 22 端口可能不可用，于是 clone 失败。

---

## 七、最终解决方案

以后从 GitHub 页面复制 SSH 地址后，不要直接使用：

```bash
git clone git@github.com:sturdy-potato/zhuwei-blog.git
```

而是把中间的 `github.com` 改成自己配置的 SSH 别名：

```bash
git clone git@github-sturdy:sturdy-potato/zhuwei-blog.git
```

完整操作如下：

```bash
cd /Users/xxx/Desktop/sturdy-potato
git clone git@github-sturdy:sturdy-potato/zhuwei-blog.git
```

如果是另一个仓库：

```bash
git clone git@github-sturdy:sturdy-potato/vercel-lab-api.git
```

clone 完之后可以检查 remote：

```bash
git remote -v
```

正常应该看到：

```text
origin  git@github-sturdy:sturdy-potato/zhuwei-blog.git (fetch)
origin  git@github-sturdy:sturdy-potato/zhuwei-blog.git (push)
```

---

## 八、多 GitHub 账号的推荐配置方式

如果本机后续还有另一个 GitHub 账号，不建议继续使用 `Host github.com` 绑定某个默认账号。

推荐全部使用账号别名。例如：

```sshconfig
Host github-sturdy
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519_sturdy
  IdentitiesOnly yes

Host github-other
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519_other
  IdentitiesOnly yes
```

那么不同账号的仓库就这样拉：

```bash
git clone git@github-sturdy:sturdy-potato/project-a.git
```

或者：

```bash
git clone git@github-other:other-account/project-b.git
```

核心规则是：

```text
git@SSH别名:GitHub账号名/仓库名.git
```

例如：

```text
git@github-sturdy:sturdy-potato/zhuwei-blog.git
```

其中 `github-sturdy` 必须对应 `~/.ssh/config` 里的：

```text
Host github-sturdy
```

---

## 九、总结

这次问题表面上是 GitHub clone 失败，本质上涉及三个点：

1. SSH 认证成功，不代表 clone 一定成功。还要看 clone 地址匹配的是哪个 Host，以及最终走的是哪个端口。
2. 多账号不要依赖默认 `github.com`。最好用 `github-sturdy`、`github-other` 这类别名显式区分账号，后续维护成本更低。
3. GitHub 复制的 SSH 地址不一定适合你的本机配置。默认地址是 `git@github.com:账号/仓库.git`，如果本机用的是 SSH 别名，就需要手动改成 `git@别名:账号/仓库.git`。

以后遇到类似问题，可以先跑这一句：

```bash
ssh -vT github-sturdy 2>&1 | grep -E "Offering public key|Authenticated|Hi "
```

它能直接告诉你：当前 SSH 到底用了哪个 key、连到了哪里、认证成了哪个 GitHub 账号。
