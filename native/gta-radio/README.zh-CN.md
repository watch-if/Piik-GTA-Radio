# Piik 的 GTA V 车载电台

Windows 版 Piik 的本地房间和公网邀请支持车载电台。直播时，房间里唯一的观众可以在观看页选电台。房主在 GTA V 故事模式驾驶位时，游戏插件会处理切台。观众可以选择预设电台，歌曲由游戏电台播放。

## 编译

需要 Node.js 24 至 26、npm 11、Go 1.26、Visual Studio C++ x64 Build Tools，及 [Script Hook V SDK](https://www.dev-c.com/gtav/scripthookv/)。从 Visual Studio 的「x64 Native Tools Command Prompt」在 Piik 源码根目录运行，替换成已解压的 SDK 路径。

```bat
powershell -NoProfile -File native\gta-radio\Build-GtaRadio.ps1 -ScriptHookSdk "D:\SDK\ScriptHookV"
```

## 放入现有安装

1. 将 `build\gta-radio\piik-radio.exe` 和 `Start-Piik-Radio.cmd` 放在原 Piik 安装目录的 `runtime` 文件夹旁边。
2. 退出 GTA V，将 `build\gta-radio\PiikGtaRadio.asi` 放在 GTA V 增强版目录的 `GTA5_Enhanced.exe` 旁边。该插件使用现有的 ASI Loader 和与你游戏版本匹配的 Script Hook V。
3. 双击 `Start-Piik-Radio.cmd`，选择「本地房间」或「公网邀请」。在故事模式驾驶，并开始分享 GTA V 的画面和声音。让唯一的观众打开邀请，在观看页选择「车载电台」。

观看页的「切台指令已发送」表示 Piik 已把指令交给本机游戏插件。进入驾驶位后，所选电台应从游戏声音中听到。部分电台会随游戏进度或车辆变化。
