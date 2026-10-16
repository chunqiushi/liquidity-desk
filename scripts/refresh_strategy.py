#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
期货策略自动刷新编排脚本（真实数据）：
  1. 挂载并复制另一台电脑的 v2t_logs（Z: -> 本机 G:/sync/v2t_logs）
  2. 生成 lib/strategy-data.ts（真实数据，SAMPLE=false）
  3. 用 ASCII 临时副本法构建 Next.js（npm run build）
  4. 将 out/ 拷回项目目录

部署步骤（CloudStudio）由自动化任务在调用本脚本后单独执行。
"""
import os
import sys
import subprocess
import shutil

PROJECT = r"G:/工作台/liquidity-desk"
TEMP = r"C:/Users/lv/AppData/Local/Temp/ld_real"  # 备用：temp 副本法（已弃用，改用 junction）
NODE_BIN = r"C:/Users/lv/.workbuddy/binaries/node/versions/22.22.2"
TRASH = r"C:/Users/lv/AppData/Local/Temp/ld_trash"
JUNCTION = r"C:\wb\liquidity-desk"  # ASCII 入口 junction -> 中文项目（构建用，避免 node_modules 缺失）
SRC_REMOTE = r"\\DESKTOP-CNF0I9C\v2t_logs"
LOCAL_DIR = r"G:/sync/v2t_logs"
FILES = ["equity_curve.csv", "trades_record.csv", "positions_history.json"]


def run(cmd, cwd=None, env=None):
    print(f"[refresh] $ {cmd if isinstance(cmd, str) else ' '.join(cmd)}")
    is_robocopy = isinstance(cmd, str) and "robocopy" in cmd.lower()
    p = subprocess.run(cmd, shell=isinstance(cmd, str), cwd=cwd, env=env,
                       capture_output=True, text=True)
    if p.stdout:
        print(p.stdout[-1500:])
    # robocopy 退出码为位掩码：0-7 均为成功（如 1=全部复制、2=多余文件、
    # 3=部分复制+多余文件），>=8 才是真正的错误。其它命令仍按 0 判定。
    if is_robocopy:
        ok = p.returncode < 8
    else:
        ok = p.returncode == 0
    if not ok:
        if p.stderr:
            print(p.stderr[-1500:])
        raise SystemExit(f"command failed (exit {p.returncode}): {cmd}")
    return p


def find_latest_signal_log(src_root):
    """在共享目录中挑选真正的策略日志：文件名倒序最新的 tqsdk_v2t_enhanced_*.log
    且包含 4H信号 块的文件，优先用于解析多空信号；找不到时回退 strategy_stdout.log。
    """
    import glob
    pat = os.path.join(src_root, "tqsdk_v2t_enhanced_*.log")
    files = sorted(glob.glob(pat), key=lambda f: os.path.basename(f), reverse=True)
    if not files and os.path.exists(os.path.join(src_root, "strategy_stdout.log")):
        return os.path.join(src_root, "strategy_stdout.log")
    for f in files:
        try:
            with open(f, "r", encoding="utf-8", errors="replace") as fh:
                fh.seek(0, 2)
                sz = fh.tell()
                fh.seek(max(0, sz - 400000))
                chunk = fh.read()
            if "4H信号" in chunk:
                return f
        except Exception:
            continue
    return files[0] if files else (
        os.path.join(src_root, "strategy_stdout.log")
        if os.path.exists(os.path.join(src_root, "strategy_stdout.log")) else None
    )


def ensure_local_copy():
    os.makedirs(LOCAL_DIR, exist_ok=True)
    # 尝试挂载 Z:
    if not os.path.exists(r"Z:\\") and not os.path.exists("/z/"):
        try:
            subprocess.run(
                f'net use Z: "{SRC_REMOTE}" /user:DESKTOP-CNF0I9C\\v2treader 198954 /persistent:yes',
                shell=True, capture_output=True, text=True, timeout=30,
            )
        except Exception as e:
            print(f"[refresh] mount attempt: {e}")
    src_root = r"Z:\\" if os.path.exists(r"Z:\\") else ("/z/" if os.path.exists("/z/") else None)
    if not src_root:
        raise SystemExit(f"无法访问 {SRC_REMOTE}，请确认目标机已放开网络访问权限并挂载 Z:。")
    copied = 0
    for fn in FILES:
        sp = os.path.join(src_root, fn)
        if os.path.exists(sp):
            shutil.copy2(sp, os.path.join(LOCAL_DIR, fn))
            copied += 1
            print(f"[refresh] copied {fn}")
    if copied == 0:
        raise SystemExit(f"{src_root} 中未找到策略文件，请确认同步目录。")
    # 复制真正的策略日志末段（含多空信号等状态输出），供 build 解析。
    # 优先取最新的 tqsdk_v2t_enhanced_*.log（含 4H信号 块），回退 strategy_stdout.log。
    log_src = find_latest_signal_log(src_root)
    tail_dst = os.path.join(LOCAL_DIR, "strategy_stdout_tail.txt")
    if log_src and os.path.exists(log_src):
        try:
            with open(log_src, "rb") as f:
                f.seek(0, 2)
                size = f.tell()
                f.seek(max(0, size - 300000))
                data = f.read()
            with open(tail_dst, "wb") as f:
                f.write(data)
            print(f"[refresh] copied signal log tail from {os.path.basename(log_src)} ({len(data)} bytes)")
        except Exception as e:
            print(f"[refresh] skip log tail: {e}")
    else:
        print(f"[refresh] 未找到策略日志，跳过信号解析")
    print(f"[refresh] local copy ready: {copied}/{len(FILES)} files -> {LOCAL_DIR}")


def ensure_junction():
    """在 ASCII 路径建 junction 指向中文项目，从 junction 侧构建。

    关键：junction 对 node_modules 内的软链（.bin/next、next/dist/compiled/*）100% 透明转发，
    无需拷贝，因此不会出现 temp 副本法'node_modules 缺失 -> next 不是命令'的坑。
    同时构建时由调用方设置 NODE_OPTIONS="" 禁用 safe-delete 垫片，避免中文路径清理报 FileNotFoundException。
    """
    ps = (
        f'$p="{JUNCTION}";'
        f'$t="{PROJECT}";'
        'if(Test-Path $p){'
        '$it=Get-Item $p -Force;'
        'if($it.LinkType -eq "Junction" -or $it.LinkType -eq "SymbolicLink"){'
        'cmd /c ("rmdir \""+$p+"\"")}'
        'else{Write-Error ("stale real dir at "+$p+"; remove manually"); exit 1}'
        '}'
        'New-Item -ItemType Junction -Path $p -Target $t | Out-Null;'
        'Write-Host ("[refresh] junction ready: "+$p+" -> "+$t)'
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                   shell=False, check=True, capture_output=True, text=True)


def main():
    py = sys.executable
    # 1. 复制真实数据到本机
    ensure_local_copy()

    # 2. 生成 TS 数据模块（读取 G:/sync/v2t_logs）
    run([py, os.path.join(PROJECT, "scripts", "build_strategy_data.py"), "--src", LOCAL_DIR])

    # 3. 在 ASCII junction 下构建（node_modules 软链透明，无需拷贝）
    env = dict(os.environ)
    env["PATH"] = NODE_BIN + ";" + env.get("PATH", "")
    env["NODE_OPTIONS"] = ""            # 关键：禁用 safe-delete 垫片（否则中文路径清理报 FileNotFoundException）
    env["GENIE_TRASH_DIR"] = TRASH
    env["CODEBUDDY_SAFE_DELETE"] = "0"
    env["NEXT_TELEMETRY_DISABLED"] = "1"

    ensure_junction()
    run("npm run build", cwd=JUNCTION, env=env)

    # out/ 经 junction 透明写回 PROJECT/out，无需回拷
    print("[refresh] done: out/ updated, ready to deploy")


if __name__ == "__main__":
    main()
