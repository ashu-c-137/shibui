param(
  [ValidateSet("reserve", "restore")]
  [string]$Action = "reserve",
  [int]$Height = 32,
  [string]$Hwnd = "0",
  [int]$Left = 0,
  [int]$Top = 0,
  [int]$Right = 0,
  [int]$Bottom = 0
)

$ErrorActionPreference = "Stop"
$stateFile = Join-Path $env:TEMP "rice-statusbar-appbar.json"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class RiceAppBar {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [StructLayout(LayoutKind.Sequential)]
  public struct APPBARDATA {
    public int cbSize;
    public IntPtr hWnd;
    public uint uCallbackMessage;
    public uint uEdge;
    public RECT rc;
    public IntPtr lParam;
  }
  [DllImport("shell32.dll")] public static extern uint SHAppBarMessage(uint dwMessage, ref APPBARDATA pData);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern uint RegisterWindowMessage(string lpString);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SystemParametersInfo(int uiAction, int uiParam, ref RECT pvParam, int fWinIni);

  const int SPI_SETWORKAREA = 0x002F;
  const int SPI_GETWORKAREA = 0x0030;
  const int SPIF_NOTIFY = 0x01 | 0x02;

  public static string GetWork() {
    RECT rc = new RECT();
    SystemParametersInfo(SPI_GETWORKAREA, 0, ref rc, 0);
    return rc.Left + "," + rc.Top + "," + rc.Right + "," + rc.Bottom;
  }

  public static void SetWork(int left, int top, int right, int bottom) {
    RECT rc = new RECT();
    rc.Left = left;
    rc.Top = top;
    rc.Right = right;
    rc.Bottom = bottom;
    SystemParametersInfo(SPI_SETWORKAREA, 0, ref rc, SPIF_NOTIFY);
  }

  public static string Dock(long hwndValue, int left, int top, int right, int height) {
    IntPtr hwnd = new IntPtr(hwndValue);
    APPBARDATA data = new APPBARDATA();
    data.cbSize = Marshal.SizeOf(typeof(APPBARDATA));
    data.hWnd = hwnd;
    data.uCallbackMessage = RegisterWindowMessage("RiceStatusBar");
    SHAppBarMessage(0, ref data);
    data.uEdge = 1;
    data.rc.Left = left;
    data.rc.Top = top;
    data.rc.Right = right;
    data.rc.Bottom = top + height;
    SHAppBarMessage(2, ref data);
    if (data.rc.Right - data.rc.Left < 10) {
      data.rc.Left = left;
      data.rc.Top = top;
      data.rc.Right = right;
      data.rc.Bottom = top + height;
    } else {
      data.rc.Bottom = data.rc.Top + height;
    }
    SHAppBarMessage(3, ref data);
    int w = Math.Max(1, data.rc.Right - data.rc.Left);
    MoveWindow(hwnd, data.rc.Left, data.rc.Top, w, height, true);
    SetWindowPos(hwnd, new IntPtr(-1), data.rc.Left, data.rc.Top, w, height, 0x0010 | 0x0040);
    RECT actual;
    if (GetWindowRect(hwnd, out actual) && actual.Bottom > data.rc.Top) {
      data.rc.Left = actual.Left;
      data.rc.Top = actual.Top;
      data.rc.Right = actual.Right;
      data.rc.Bottom = actual.Bottom;
      SHAppBarMessage(3, ref data);
    }
    return data.rc.Left + "," + data.rc.Top + "," + data.rc.Right + "," + data.rc.Bottom;
  }

  public static void Undock(long hwndValue) {
    if (hwndValue == 0) return;
    APPBARDATA data = new APPBARDATA();
    data.cbSize = Marshal.SizeOf(typeof(APPBARDATA));
    data.hWnd = new IntPtr(hwndValue);
    SHAppBarMessage(1, ref data);
  }
}
"@

function Parse-Rect([string]$packed) {
  $n = $packed.Split(",")
  return @{
    left = [int]$n[0]
    top = [int]$n[1]
    right = [int]$n[2]
    bottom = [int]$n[3]
  }
}

function Read-State {
  if (-not (Test-Path $stateFile)) { return $null }
  try { return Get-Content $stateFile -Raw | ConvertFrom-Json } catch { return $null }
}

function Restore-Work {
  $saved = Read-State
  if ($saved -and $null -ne $saved.workLeft) {
    [RiceAppBar]::SetWork([int]$saved.workLeft, [int]$saved.workTop, [int]$saved.workRight, [int]$saved.workBottom)
  }
  if ($saved -and $saved.hwnd) { [RiceAppBar]::Undock([int64]$saved.hwnd) }
  if ($Hwnd -and $Hwnd -ne "0") { [RiceAppBar]::Undock([int64]$Hwnd) }
  Remove-Item $stateFile -Force -ErrorAction SilentlyContinue
}

if ($Action -eq "restore") {
  Restore-Work
  @{ ok = $true } | ConvertTo-Json -Compress
  exit 0
}

$saved = Read-State
$work = $null
if ($saved -and $null -ne $saved.workLeft) {
  $work = @{
    left = [int]$saved.workLeft
    top = [int]$saved.workTop
    right = [int]$saved.workRight
    bottom = [int]$saved.workBottom
  }
  if ($saved.hwnd) { [RiceAppBar]::Undock([int64]$saved.hwnd) }
} else {
  $work = Parse-Rect ([RiceAppBar]::GetWork())
}

$packed = [RiceAppBar]::Dock([int64]$Hwnd, $Left, $Top, $Right, $Height)
$bar = Parse-Rect $packed
$workTop = [math]::Max($work.top, $bar.bottom)
[RiceAppBar]::SetWork($work.left, $workTop, $work.right, $work.bottom)
@{
  hwnd = $Hwnd
  left = $bar.left
  top = $bar.top
  right = $bar.right
  bottom = $bar.bottom
  workLeft = $work.left
  workTop = $work.top
  workRight = $work.right
  workBottom = $work.bottom
} | ConvertTo-Json -Compress | Tee-Object -FilePath $stateFile
