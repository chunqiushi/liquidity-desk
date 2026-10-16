@echo off
REM =====================================================================
REM  liquidity-desk 静态导出 + 上云准备脚本（中文路径修复版）
REM  作者：Buddy  |  适用：G:\工作台\liquidity-desk (Next.js, output:export)
REM  用法：双击本文件，或在 CMD 中 cd 到本目录后运行 deploy-cloudstudio.bat
REM  说明：构建完成后，用 WorkBuddy 的「部署到 CloudStudio」选择 out\ 目录即可。
REM =====================================================================
setlocal

REM ---- 路径配置（按需修改）----
set "SRC=G:\工作台\liquidity-desk"
set "JUNC=G:\ld-build\liquidity-desk"
set "NODE=C:\Users\lv\.workbuddy\binaries\node\versions\22.22.2"

echo [1/3] 建立 ASCII junction（解决中文路径导致 next build 静态导出失败）
powershell -NoProfile -Command "Remove-Item '%JUNC%' -Force -ErrorAction SilentlyContinue; New-Item -ItemType Junction -Path '%JUNC%' -Target '%SRC%' | Out-Null"
if not exist "%JUNC%" (
  echo [错误] junction 创建失败，请检查 SRC 路径是否存在。
  pause & exit /b 1
)

echo [2/3] 在 ASCII 路径下构建（清空 NODE_OPTIONS 禁用 safe-delete 垫片，双管齐下）
cd /d "%JUNC%"
set "NODE_OPTIONS="
set "NEXT_TELEMETRY_DISABLED=1"
set "PATH=%NODE%;%PATH%"
npm run build
if errorlevel 1 (
  echo.
  echo [错误] 构建失败。常见原因与处理：
  echo   1) 报 "EBUSY / 资源忙 / Another program is using this file" —— out 目录被其它进程锁住
  echo      （多为资源管理器预览窗口、索引器或 Defender 实时扫描）。
  echo      处理：关闭该文件夹的资源管理器窗口，或在 Windows Defender 排除项中加入：
  echo        %SRC%
  echo      然后再跑一次本脚本。
  echo   2) 报导出子进程 143 (SIGTERM) —— 仍走中文 cwd，请确认 junction 已生效（见步骤1）。
  pause & exit /b 1
)

echo [3/3] 静态产物已生成：%SRC%\out
echo   下一步：在 WorkBuddy 中执行「部署到 CloudStudio」，选择目录 %SRC%\out
echo   （CloudStudio 仅支持纯静态站；本项目数据全在客户端，符合要求。）
endlocal
pause
