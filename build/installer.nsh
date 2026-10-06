!ifndef BUILD_UNINSTALLER
!include nsDialogs.nsh
!include LogicLib.nsh

Var ShibuiDlg
Var CbLogo
Var CbWindow
Var CbClock
Var CbMedia
Var CbSound
Var CbNetwork
Var CbBattery
Var CbCpu
Var CbGpu
Var CbRam
Var CbSearch
Var CbPower
Var CbSettings

!macro SHIBUI_BOX HWND X Y LABEL
  ${NSD_CreateCheckbox} ${X} ${Y} 145u 12u "${LABEL}"
  Pop ${HWND}
  ${NSD_Check} ${HWND}
!macroend

!macro customPageAfterChangeDir
  PageEx custom
    PageCallbacks shibuiPageShow shibuiPageLeave
  PageExEnd

  Function shibuiPageShow
    !insertmacro MUI_HEADER_TEXT "Choose the bar" "Pick what Shibui shows. You can change this later in the dashboard."
    nsDialogs::Create 1018
    Pop $ShibuiDlg

    !insertmacro SHIBUI_BOX $CbLogo 0 0u "Shibui menu"
    !insertmacro SHIBUI_BOX $CbWindow 0 16u "Current window"
    !insertmacro SHIBUI_BOX $CbClock 0 32u "Time"
    !insertmacro SHIBUI_BOX $CbMedia 0 48u "Now playing"
    !insertmacro SHIBUI_BOX $CbSound 0 64u "Sound"
    !insertmacro SHIBUI_BOX $CbNetwork 0 80u "Network"
    !insertmacro SHIBUI_BOX $CbBattery 0 96u "Battery"

    !insertmacro SHIBUI_BOX $CbCpu 160u 0u "CPU"
    !insertmacro SHIBUI_BOX $CbGpu 160u 16u "GPU"
    !insertmacro SHIBUI_BOX $CbRam 160u 32u "Memory"
    !insertmacro SHIBUI_BOX $CbSearch 160u 48u "Quick search"
    !insertmacro SHIBUI_BOX $CbPower 160u 64u "Power"
    !insertmacro SHIBUI_BOX $CbSettings 160u 80u "Dashboard"

    nsDialogs::Show
  FunctionEnd

  Function shibuiFlag
    Exch $R0
    ${NSD_GetState} $R0 $R1
    ${If} $R1 = 1
      StrCpy $R0 "true"
    ${Else}
      StrCpy $R0 "false"
    ${EndIf}
    Exch $R0
  FunctionEnd

  Function shibuiPageLeave
    Push $CbLogo
    Call shibuiFlag
    Pop $R2
    Push $CbWindow
    Call shibuiFlag
    Pop $R3
    Push $CbClock
    Call shibuiFlag
    Pop $R4
    Push $CbMedia
    Call shibuiFlag
    Pop $R5
    Push $CbSound
    Call shibuiFlag
    Pop $R6
    Push $CbNetwork
    Call shibuiFlag
    Pop $R7
    Push $CbBattery
    Call shibuiFlag
    Pop $R8
    Push $CbCpu
    Call shibuiFlag
    Pop $R9
    Push $CbGpu
    Call shibuiFlag
    Pop $0
    Push $CbRam
    Call shibuiFlag
    Pop $1
    Push $CbSearch
    Call shibuiFlag
    Pop $2
    Push $CbPower
    Call shibuiFlag
    Pop $3
    Push $CbSettings
    Call shibuiFlag
    Pop $4

    CreateDirectory "$APPDATA\Shibui"
    FileOpen $5 "$APPDATA\Shibui\installer-widgets.json" w
    FileWrite $5 "{$\"logo$\":$R2,$\"activeWindow$\":$R3,$\"clock$\":$R4,$\"media$\":$R5,$\"sound$\":$R6,$\"network$\":$R7,$\"battery$\":$R8,$\"cpu$\":$R9,$\"gpu$\":$0,$\"ram$\":$1,$\"search$\":$2,$\"power$\":$3,$\"settings$\":$4}"
    FileClose $5
  FunctionEnd
!macroend
!endif
