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
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SystemParametersInfo(int uiAction, int uiParam, ref RECT pvParam, int fWinIni);

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
    return data.rc.Left + "," + data.rc.Top + "," + data.rc.Right + "," + (data.rc.Top + height);
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

function Remove-SavedBar {
  if (-not (Test-Path $stateFile)) { return }
  try {
    $saved = Get-Content $stateFile -Raw | ConvertFrom-Json
    if ($saved.hwnd) { [RiceAppBar]::Undock([int64]$saved.hwnd) }
  } catch { }
  Remove-Item $stateFile -Force -ErrorAction SilentlyContinue
}

if ($Action -eq "restore") {
  Remove-SavedBar
  if ($Hwnd -and $Hwnd -ne "0") { [RiceAppBar]::Undock([int64]$Hwnd) }
  @{ ok = $true } | ConvertTo-Json -Compress
  exit 0
}

Remove-SavedBar
$packed = [RiceAppBar]::Dock([int64]$Hwnd, $Left, $Top, $Right, $Height)
$n = $packed.Split(",")
@{
  hwnd = $Hwnd
  left = [int]$n[0]
  top = [int]$n[1]
  right = [int]$n[2]
  bottom = [int]$n[3]
} | ConvertTo-Json -Compress | Tee-Object -FilePath $stateFile
