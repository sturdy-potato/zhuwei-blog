---
title: "GitHub CLI 克隆仓库失败：从 gh auth login 到 SSH 443 端口修复"
excerpt: "记录一次使用 gh repo clone 克隆 GitHub 仓库时，从未登录、SSH 22 端口被断开，到最终通过 SSH 443 端口修复的完整过程。"
pubDate: 2026-04-24
category: "技术"
section: "技术专栏"
tags:
  - GitHub
  - Git
  - SSH
  - GitHub CLI
  - macOS
color: "blue"
icon: "Terminal"
minutes: 6
views: 0
comments: 0
draft: false
---

## 背景

最近在一台新的 macOS 环境上克隆 GitHub 仓库时，使用的是 GitHub CLI，也就是 `gh` 命令。

GitHub CLI 是 GitHub 官方提供的命令行工具，可以在终端里操作 GitHub，例如登录账号、查看仓库、克隆仓库、创建 Pull Request、查看 Issue 等。简单理解，`gh` 就是把很多原本需要在 GitHub 网页上完成的操作，搬到了命令行里。

官方说明里也明确提到，GitHub CLI 可以通过 `gh auth login` 完成认证，并且可以使用 `gh repo clone OWNER/REPO` 克隆仓库。[GitHub CLI manual](https://cli.github.com/manual/)

这次遇到的问题分成两段：

1. 一开始是 `gh` 没有登录；
2. 登录成功之后，SSH 连接 GitHub 的 22 端口又被断开。

下面按实际排查过程整理。

---

## 安装 GitHub CLI

macOS 上如果已经安装了 Homebrew，可以直接执行：

```bash
brew install gh
```

如果已经安装过，会看到类似提示：

```bash
Warning: gh x.x.x is already installed and up-to-date.
```

这说明 `gh` 已经存在，不需要重复安装。

可以用下面命令确认版本：

```bash
gh --version
```

如果能正常输出版本号，就说明 GitHub CLI 安装成功。

---

## 第一次克隆失败：GitHub CLI 没有登录

执行：

```bash
gh repo clone OWNER/REPO
```

报错：

```bash
To get started with GitHub CLI, please run: gh auth login
Alternatively, populate the GH_TOKEN environment variable with a GitHub API authentication token.
```

这个错误的意思很直接：`gh` 已经安装了，但还没有登录 GitHub 账号。

解决办法是执行：

```bash
gh auth login
```

常见选择如下：

```text
? Where do you use GitHub? GitHub.com
? What is your preferred protocol for Git operations on this host? SSH
? Upload your SSH public key to your GitHub account? ~/.ssh/id_ed25519_xxx.pub
? Title for your SSH key: GitHub CLI
? How would you like to authenticate GitHub CLI? Login with a web browser
```

这里几个选项的含义：

| 选项 | 含义 |
|---|---|
| `GitHub.com` | 使用普通 GitHub 官网账号 |
| `SSH` | 后续 Git 操作优先使用 SSH 协议 |
| 上传 SSH public key | 把本机公钥添加到 GitHub 账号 |
| `Login with a web browser` | 通过浏览器完成授权登录 |

随后终端会给出一个一次性验证码和登录地址，打开浏览器完成授权即可。

成功后会看到类似：

```bash
✓ Authentication complete.
✓ Configured git protocol
✓ SSH key already existed on your GitHub account
✓ Logged in as USERNAME
```

到这里，`gh` 登录问题已经解决。

---

## 第二次克隆失败：SSH 22 端口连接被断开

登录成功后，再次执行：

```bash
gh repo clone OWNER/REPO
```

这时出现了新的错误：

```bash
Cloning into 'REPO'...
Connection closed by xxx.xxx.xxx.xxx port 22
fatal: Could not read from remote repository.

Please make sure you have the correct access rights and the repository exists.
failed to run git: exit status 128
```

这个错误容易误判成“仓库不存在”或者“权限不对”，但这次的关键点其实是：

```bash
Connection closed by xxx.xxx.xxx.xxx port 22
```

也就是 SSH 连接 GitHub 的 `22` 端口时被断开。

由于前面已经出现：

```bash
✓ Logged in as USERNAME
✓ SSH key already existed on your GitHub account
```

所以问题大概率不是 GitHub CLI 登录失败，也不是 SSH key 没上传，而是当前网络环境对 SSH 22 端口不友好。

GitHub 官方文档也说明，如果防火墙拒绝 SSH 连接，可以尝试让 SSH 走 HTTPS 常用的 443 端口。[Using SSH over the HTTPS port](https://docs.github.com/en/authentication/troubleshooting-ssh/using-ssh-over-the-https-port)

---

## 解决办法：让 GitHub SSH 走 443 端口

编辑 SSH 配置文件：

```bash
cat >> ~/.ssh/config <<'EOF'

Host github.com
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/id_ed25519_xxx
  IdentitiesOnly yes
EOF
```

注意把这里的私钥路径替换成你自己的：

```bash
~/.ssh/id_ed25519_xxx
```

不要写 `.pub` 文件。  
`.pub` 是公钥，`IdentityFile` 这里要写私钥文件。

配置完成后，测试 SSH 连接：

```bash
ssh -T git@github.com
```

如果看到：

```bash
Hi USERNAME! You've successfully authenticated, but GitHub does not provide shell access.
```

说明 SSH 已经认证成功。

这句话不是报错。  
它的意思是：GitHub 已经确认你是谁，但 GitHub 不提供普通服务器那种 shell 登录能力。对于 Git clone / pull / push 来说，这是正常结果。

---

## 重新克隆仓库

确认 SSH 443 端口可用后，重新执行：

```bash
rm -rf REPO
gh config set -h github.com git_protocol ssh
gh repo clone OWNER/REPO
```

或者直接用原生 Git 克隆：

```bash
rm -rf REPO
git clone git@github.com:OWNER/REPO.git
```

如果前面的 SSH 测试已经成功，这一步通常就能正常完成。

---

## 备用方案：改用 HTTPS 克隆

如果不想处理 SSH，也可以让 `gh` 改用 HTTPS：

```bash
gh config set -h github.com git_protocol https
gh repo clone OWNER/REPO
```

HTTPS 通常对网络环境更友好，适合只想快速拉代码的场景。

不过如果你后续需要频繁 `push`、`pull`，并且已经配置好了 SSH key，那么继续使用 SSH 会更符合日常开发习惯。

---

## 排查思路总结

这次问题可以拆成两层：

| 阶段 | 报错现象 | 根因 | 解决办法 |
|---|---|---|---|
| 第一次失败 | 提示执行 `gh auth login` | GitHub CLI 没有登录 | 执行 `gh auth login` |
| 第二次失败 | `Connection closed ... port 22` | SSH 22 端口连接被断开 | 改成 SSH 走 443 端口 |
| 最终验证 | `You've successfully authenticated` | SSH key 和 GitHub 账号匹配成功 | 可以重新 clone |

核心判断标准：

```bash
gh auth status
```

用来检查 GitHub CLI 是否登录。

```bash
ssh -T git@github.com
```

用来检查 SSH 是否能连通 GitHub。

如果 `gh auth status` 正常，但 `git clone` 失败，就不要只盯着 `gh` 登录状态，要继续看 Git 实际使用的是 HTTPS 还是 SSH，以及 SSH 连接的是哪个端口。

---

## 最终可复用命令

如果已经登录 GitHub CLI，但 SSH 22 端口被断开，可以直接按下面流程处理：

```bash
cat >> ~/.ssh/config <<'EOF'

Host github.com
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/id_ed25519_xxx
  IdentitiesOnly yes
EOF

ssh -T git@github.com

gh config set -h github.com git_protocol ssh
gh repo clone OWNER/REPO
```

看到下面这行，就说明 SSH 认证已经成功：

```bash
Hi USERNAME! You've successfully authenticated, but GitHub does not provide shell access.
```

后续再执行 `gh repo clone OWNER/REPO`，就会走 SSH 443 端口完成克隆。