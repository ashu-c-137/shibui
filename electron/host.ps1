#Requires -Version 5.1
param(
  [int]$SkipPid = 0,
  [ValidateSet("poll", "volume", "mute", "media", "power", "search", "launch", "apps", "watch")]
  [string]$Action = "poll",
  [string]$Arg1 = "",
  [string]$Arg2 = ""
)

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class RiceWin {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [StructLayout(LayoutKind.Sequential)]
  public struct MONITORINFO {
    public int cbSize;
    public RECT rcMonitor;
    public RECT rcWork;
    public uint dwFlags;
  }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out int pvAttribute, int cbAttribute);
  [DllImport("user32.dll")] public static extern bool LockWorkStation();
  [DllImport("powrprof.dll", SetLastError=true)] public static extern bool SetSuspendState(bool hibernate, bool forceCritical, bool disableWakeEvent);
}
"@

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ShibuiCpu {
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool GetSystemTimes(out long idle, out long kernel, out long user);
}
"@

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ShibuiMem {
  [StructLayout(LayoutKind.Sequential)]
  public struct MEMORYSTATUSEX {
    public uint dwLength;
    public uint dwMemoryLoad;
    public ulong ullTotalPhys;
    public ulong ullAvailPhys;
    public ulong ullTotalPageFile;
    public ulong ullAvailPageFile;
    public ulong ullTotalVirtual;
    public ulong ullAvailVirtual;
    public ulong ullAvailExtendedVirtual;
  }
  [DllImport("kernel32.dll")] public static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);
  [DllImport("kernel32.dll")] public static extern ulong GetTickCount64();
}
"@

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class RiceAudio {
  public static float GetMaster() {
    IAudioEndpointVolume vol = GetVol();
    float v; vol.GetMasterVolumeLevelScalar(out v);
    Marshal.ReleaseComObject(vol);
    return v;
  }
  public static bool GetMute() {
    IAudioEndpointVolume vol = GetVol();
    bool m; vol.GetMute(out m);
    Marshal.ReleaseComObject(vol);
    return m;
  }
  public static void SetMaster(float v) {
    if (v < 0f) v = 0f; if (v > 1f) v = 1f;
    IAudioEndpointVolume vol = GetVol();
    Guid g = Guid.Empty;
    vol.SetMasterVolumeLevelScalar(v, ref g);
    Marshal.ReleaseComObject(vol);
  }
  public static void SetMute(bool m) {
    IAudioEndpointVolume vol = GetVol();
    Guid g = Guid.Empty;
    vol.SetMute(m, ref g);
    Marshal.ReleaseComObject(vol);
  }
  static IAudioEndpointVolume GetVol() {
    IMMDeviceEnumerator en = (IMMDeviceEnumerator)new MMDeviceEnumerator();
    IMMDevice dev = en.GetDefaultAudioEndpoint(0, 1);
    Guid iid = typeof(IAudioEndpointVolume).GUID;
    object o;
    dev.Activate(ref iid, 1, IntPtr.Zero, out o);
    Marshal.ReleaseComObject(dev);
    Marshal.ReleaseComObject(en);
    return (IAudioEndpointVolume)o;
  }
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator {}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr devices);
  IMMDevice GetDefaultAudioEndpoint(int dataFlow, int role);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int RegisterControlChangeNotify(IntPtr pNotify);
  int UnregisterControlChangeNotify(IntPtr pNotify);
  int GetChannelCount(out int pnChannelCount);
  int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
  int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
  int GetMasterVolumeLevel(out float pfLevelDB);
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int SetChannelVolumeLevel(uint nChannel, float fLevelDB, ref Guid pguidEventContext);
  int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, ref Guid pguidEventContext);
  int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
  int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
"@

function Get-ClassName([IntPtr]$hwnd) {
  $sb = New-Object System.Text.StringBuilder 256
  [void][RiceWin]::GetClassName($hwnd, $sb, $sb.Capacity)
  return $sb.ToString()
}

function Test-PrimaryCovered {
  $skipClass = @{
    "Progman" = $true
    "WorkerW" = $true
    "Shell_TrayWnd" = $true
    "Shell_SecondaryTrayWnd" = $true
    "DV2ControlHost" = $true
    "NotifyIconOverflowWindow" = $true
    "Windows.UI.Core.CoreWindow" = $true
    "CEF-OSC-WIDGET" = $true
  }
  $hwnd = [RiceWin]::GetForegroundWindow()
  if ($hwnd -eq [IntPtr]::Zero) { return $false }
  $procId = [uint32]0
  [void][RiceWin]::GetWindowThreadProcessId($hwnd, [ref]$procId)
  if ($SkipPid -ne 0 -and $procId -eq $SkipPid) { return $false }
  if (-not [RiceWin]::IsWindowVisible($hwnd)) { return $false }
  if ([RiceWin]::IsIconic($hwnd)) { return $false }
  $cls = Get-ClassName $hwnd
  if ($skipClass.ContainsKey($cls)) { return $false }
  $mon = [RiceWin]::MonitorFromWindow($hwnd, 2)
  $mi = New-Object RiceWin+MONITORINFO
  $mi.cbSize = 40
  if (-not [RiceWin]::GetMonitorInfo($mon, [ref]$mi)) { return $false }
  if (($mi.dwFlags -band 1) -eq 0) { return $false }
  $rect = New-Object RiceWin+RECT
  [void][RiceWin]::GetWindowRect($hwnd, [ref]$rect)
  $mw = $mi.rcMonitor.Right - $mi.rcMonitor.Left
  $mh = $mi.rcMonitor.Bottom - $mi.rcMonitor.Top
  $ww = $rect.Right - $rect.Left
  $wh = $rect.Bottom - $rect.Top
  # Only real fullscreen (window covers the monitor, including the bar).
  # Maximized-to-work-area windows sit below the bar and must not hide it.
  $coversTop = $rect.Top -le ($mi.rcMonitor.Top + 2)
  return ($coversTop -and $ww -ge ($mw - 8) -and $wh -ge ($mh - 8))
}

function Get-ActiveWindow {
  $covered = Test-PrimaryCovered
  $hwnd = [RiceWin]::GetForegroundWindow()
  if ($hwnd -eq [IntPtr]::Zero) { return @{ title = ""; app = ""; covered = $covered } }
  $procId = [uint32]0
  [void][RiceWin]::GetWindowThreadProcessId($hwnd, [ref]$procId)
  if ($SkipPid -ne 0 -and $procId -eq $SkipPid) { return @{ title = ""; app = ""; covered = $covered } }
  $sb = New-Object System.Text.StringBuilder 512
  [void][RiceWin]::GetWindowText($hwnd, $sb, $sb.Capacity)
  $title = $sb.ToString()
  $app = ""
  try {
    $p = Get-Process -Id $procId -ErrorAction Stop
    $app = $p.Description
    if (-not $app) { $app = $p.MainModule.FileVersionInfo.FileDescription }
    if (-not $app) { $app = $p.ProcessName }
  } catch { }
  if (-not $app) { $app = $title }
  return @{ title = $title; app = $app; covered = $covered }
}

$script:WinRtReady = $false
$script:AsTask = $null
$script:MediaManager = $null

function Initialize-WinRt {
  if ($script:WinRtReady) { return }
  Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
  $script:AsTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1"
  } | Select-Object -First 1
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]
  Add-Type -AssemblyName System.Drawing | Out-Null
  if (-not ("RiceThumb" -as [type])) {
    Add-Type -Path (Join-Path $PSScriptRoot "rice-thumb.dll")
  }
  $script:WinRtReady = $true
}

$script:ArtKey = ""
$script:ArtData = ""

function Get-CoverArt($props, [string]$key) {
  if ($script:ArtKey -eq $key -and $script:ArtData) {
    return $script:ArtData
  }
  $script:ArtKey = $key
  $script:ArtData = ""
  if (-not $props -or -not $props.Thumbnail) { return "" }
  try {
    $raw = [RiceThumb]::Read($props.Thumbnail)
    if (-not $raw -or $raw.Length -lt 32) { return "" }
    $bytes = New-Object System.IO.MemoryStream(,$raw)
    $img = [System.Drawing.Image]::FromStream($bytes)
    $max = 480
    $iw = [double]$img.Width
    $ih = [double]$img.Height
    $longest = [math]::Max($iw, $ih)
    if ($longest -lt 1) { $longest = 1 }
    $scale = [math]::Min(1.0, $max / $longest)
    $nw = [int][math]::Max(1, [math]::Round($iw * $scale))
    $nh = [int][math]::Max(1, [math]::Round($ih * $scale))
    $bmp = New-Object System.Drawing.Bitmap $nw, $nh
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, 0, 0, $nw, $nh)
    $out = New-Object System.IO.MemoryStream
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" } | Select-Object -First 1
    $enc = [System.Drawing.Imaging.Encoder]::Quality
    $parms = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $parms.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($enc, [long]90)
    if ($codec) { $bmp.Save($out, $codec, $parms) } else { $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg) }
    $g.Dispose(); $bmp.Dispose(); $img.Dispose(); $bytes.Dispose()
    $script:ArtData = [Convert]::ToBase64String($out.ToArray())
    $out.Dispose()
    return $script:ArtData
  } catch {
    return ""
  }
}

function Await-WinRt($op, $type) {
  $method = $script:AsTask.MakeGenericMethod($type)
  $task = $method.Invoke($null, @($op))
  if (-not $task.Wait(1200)) { return $null }
  if ($task.IsFaulted -or $task.IsCanceled) { return $null }
  return $task.Result
}

function Get-MediaManager {
  Initialize-WinRt
  if ($script:MediaManager) { return $script:MediaManager }
  $script:MediaManager = Await-WinRt ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  return $script:MediaManager
}

function Get-SessionStatus($session) {
  try { return [string]$session.GetPlaybackInfo().PlaybackStatus } catch { return "" }
}

function Get-Media {
  try {
    $manager = Get-MediaManager
    if (-not $manager) { return $null }
    $sessions = @($manager.GetSessions())
    $picked = $null
    foreach ($s in $sessions) {
      if ((Get-SessionStatus $s) -eq "Playing") { $picked = $s; break }
    }
    if (-not $picked) {
      foreach ($s in $sessions) {
        if ((Get-SessionStatus $s) -eq "Paused") { $picked = $s; break }
      }
    }
    if (-not $picked) { return $null }
    $status = Get-SessionStatus $picked
    $props = Await-WinRt ($picked.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $title = $(if ($props) { [string]$props.Title } else { "" })
    $artist = $(if ($props) { [string]$props.Artist } else { "" })
    if (-not $title -and -not $artist) { return $null }
    $art = Get-CoverArt $props "$title|$artist"
    return @{
      title  = $title
      artist = $artist
      app    = [string]$picked.SourceAppUserModelId
      status = $status
      art    = $art
    }
  } catch {
    $script:MediaManager = $null
    return $null
  }
}

function Get-Network {
  $kind = "offline"
  $name = "Offline"
  $signal = 0
  try {
    $profile = Get-NetConnectionProfile | Select-Object -First 1
    if ($profile) {
      $name = [string]$profile.Name
      $adapter = Get-NetAdapter | Where-Object { $_.InterfaceIndex -eq $profile.InterfaceIndex } | Select-Object -First 1
      $desc = [string]$adapter.InterfaceDescription + " " + [string]$adapter.Name
      if ($desc -match "Wi-?Fi|Wireless|802\.11|WLAN") {
        $kind = "wifi"
        try {
          $wlan = netsh wlan show interfaces | Out-String
          if ($wlan -match "SSID\s+:\s+(.+)") { $name = $Matches[1].Trim() }
          if ($wlan -match "Signal\s+:\s+(\d+)%") { $signal = [int]$Matches[1] }
        } catch { $signal = 70 }
      } else {
        $kind = "ethernet"
        $signal = 100
      }
    }
  } catch { }
  return @{ kind = $kind; name = $name; signal = $signal }
}

function Get-Battery {
  try {
    $b = Get-CimInstance -ClassName Win32_Battery | Select-Object -First 1
    if (-not $b) { return $null }
    return @{
      percent = [int]$b.EstimatedChargeRemaining
      charging = ($b.BatteryStatus -eq 2)
    }
  } catch { return $null }
}

function Get-StartAppsList {
  $roots = @(
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
  )
  $shell = New-Object -ComObject WScript.Shell
  $list = New-Object System.Collections.Generic.List[object]
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    Get-ChildItem -LiteralPath $root -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object {
      try {
        $sc = $shell.CreateShortcut($_.FullName)
        $target = [string]$sc.TargetPath
        if (-not $target) { return }
        $list.Add([pscustomobject]@{
          name = [IO.Path]::GetFileNameWithoutExtension($_.Name)
          path = $target
          shortcut = $_.FullName
        })
      } catch { }
    }
  }
  $list | Sort-Object name -Unique
}

$script:CpuPrev = $null

function Get-CpuPercent {
  $idle = [int64]0
  $kernel = [int64]0
  $user = [int64]0
  if (-not [ShibuiCpu]::GetSystemTimes([ref]$idle, [ref]$kernel, [ref]$user)) { return 0 }
  if (-not $script:CpuPrev) {
    $script:CpuPrev = @{ idle = $idle; kernel = $kernel; user = $user }
    Start-Sleep -Milliseconds 250
    return Get-CpuPercent
  }
  $dIdle = $idle - $script:CpuPrev.idle
  $dTotal = ($kernel - $script:CpuPrev.kernel) + ($user - $script:CpuPrev.user)
  $script:CpuPrev = @{ idle = $idle; kernel = $kernel; user = $user }
  if ($dTotal -le 0) { return 0 }
  $pct = 100.0 * ($dTotal - $dIdle) / $dTotal
  if ($pct -lt 0) { $pct = 0 }
  return [int][math]::Round([math]::Min(100, $pct))
}

function Get-GpuPercent {
  $peak = 0.0
  try {
    $samples = (Get-Counter -Counter "\GPU Engine(*)\Utilization Percentage" -ErrorAction Stop).CounterSamples
    foreach ($s in $samples) {
      if ($s.CookedValue -gt $peak) { $peak = [double]$s.CookedValue }
    }
  } catch {
    try {
      $cat = New-Object System.Diagnostics.PerformanceCounterCategory "GPU Engine"
      foreach ($inst in @($cat.GetInstanceNames())) {
        if ($inst -notlike "*engtype_3D*") { continue }
        $counter = New-Object System.Diagnostics.PerformanceCounter("GPU Engine", "Utilization Percentage", $inst)
        $v = [double]$counter.NextValue()
        if ($v -gt $peak) { $peak = $v }
      }
    } catch { }
  }
  return [int][math]::Round([math]::Min(100, $peak))
}

function Get-Usage {
  $cpu = Get-CpuPercent
  $gpu = Get-GpuPercent

  $mem = New-Object ShibuiMem+MEMORYSTATUSEX
  $mem.dwLength = [uint32][Runtime.InteropServices.Marshal]::SizeOf([type]"ShibuiMem+MEMORYSTATUSEX")
  [void][ShibuiMem]::GlobalMemoryStatusEx([ref]$mem)
  $total = [double]$mem.ullTotalPhys
  $used = $total - [double]$mem.ullAvailPhys
  $uptime = [int]([ShibuiMem]::GetTickCount64() / 1000)
  return @{
    cpu = $cpu
    gpu = $gpu
    ram = [int]$mem.dwMemoryLoad
    ramUsed = [math]::Round($used / 1GB, 1)
    ramTotal = [math]::Round($total / 1GB, 1)
    uptime = $uptime
  }
}

function Invoke-RiceAction([string]$Action, [string]$Arg1, [string]$Arg2) {
switch ($Action) {
  "volume" {
    [RiceAudio]::SetMaster([float]$Arg1)
    @{ ok = $true } | ConvertTo-Json -Compress
    break
  }
  "mute" {
    $cur = [RiceAudio]::GetMute()
    [RiceAudio]::SetMute(-not $cur)
    @{ ok = $true; muted = (-not $cur) } | ConvertTo-Json -Compress
    break
  }
  "media" {
    try {
      $manager = Get-MediaManager
      $session = $null
      if ($manager) {
        foreach ($s in @($manager.GetSessions())) {
          $st = Get-SessionStatus $s
          if ($st -eq "Playing" -or $st -eq "Paused") { $session = $s; break }
        }
        if (-not $session) { $session = $manager.GetCurrentSession() }
      }
      if ($session) {
        switch ($Arg1) {
          "next" { $null = $session.TrySkipNextAsync() }
          "prev" { $null = $session.TrySkipPreviousAsync() }
          default { $null = $session.TryTogglePlayPauseAsync() }
        }
      }
    } catch { $script:MediaManager = $null }
    @{ ok = $true } | ConvertTo-Json -Compress
    break
  }
  "power" {
    switch ($Arg1) {
      "shutdown" { Start-Process shutdown.exe -ArgumentList "/s /t 0" }
      "restart"  { Start-Process shutdown.exe -ArgumentList "/r /t 0" }
      "sleep"    { [void][RiceWin]::SetSuspendState($false, $false, $false) }
      "lock"     { [void][RiceWin]::LockWorkStation() }
    }
    @{ ok = $true } | ConvertTo-Json -Compress
    break
  }
  "launch" {
    if ($Arg1) { Start-Process -FilePath $Arg1 }
    @{ ok = $true } | ConvertTo-Json -Compress
    break
  }
  "search" {
    $q = $Arg1.ToLowerInvariant()
    $apps = Get-StartAppsList | Where-Object { $_.name.ToLowerInvariant() -like "*$q*" } | Select-Object -First 12
    @{ apps = @($apps) } | ConvertTo-Json -Compress -Depth 4
    break
  }
  "apps" {
    @{ apps = @(Get-StartAppsList) } | ConvertTo-Json -Compress -Depth 4
    break
  }
  default {
    $vol = 0; $muted = $false
    try { $vol = [int][math]::Round([RiceAudio]::GetMaster() * 100); $muted = [RiceAudio]::GetMute() } catch { }
    $active = Get-ActiveWindow
    $state = @{
      window  = @{ title = [string]$active.title; app = [string]$active.app }
      covered = [bool]$active.covered
      media   = Get-Media
      network = Get-Network
      battery = Get-Battery
      sound   = @{ volume = $vol; muted = $muted }
      usage   = Get-Usage
    }
    $state | ConvertTo-Json -Compress -Depth 6
  }
}
}

if ($Action -eq "watch") {
  while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line -eq "quit") { break }
    $parts = $line.Split("|", 3)
    $a = $parts[0]
    $b = $(if ($parts.Length -gt 1) { $parts[1] } else { "" })
    $c = $(if ($parts.Length -gt 2) { $parts[2] } else { "" })
    Invoke-RiceAction $a $b $c
    [Console]::Out.Flush()
  }
  exit 0
}

Invoke-RiceAction $Action $Arg1 $Arg2
