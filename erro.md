date/time          : 2026-05-22, 16:24:28, 661ms
computer name      : VS-REAG-28
wts client name    : NW980
user name          : reag.user
registered owner   : Oracle Public Cloud / Oracle.com
operating system   : Windows 2019 x64 build 17763
system language    : English
system up time     : 13 days 16 hours
program up time    : 2 hours 40 minutes
processors         : 2x AMD EPYC 7J13 64-Core Processor
physical memory    : 7556/16379 MB (free/total)
free disk space    : (C:) 130,04 GB
display mode       : 1366x768, 32 bit
process id         : $18c
allocated memory   : 173,74 MB
largest free block : 1,91 GB
executable         : Reag3C.exe
exec. date/time    : 2025-12-29 19:10
version            : 4.0.2409.1030
compiled with      : Delphi 10.1 Berlin
madExcept version  : 5.1.2
callstack crc      : $fed35eed, $7d273aad, $b057d4c3
exception number   : 3
exception class    : EAccessViolation
exception message  : Access violation at address 005DD604 in module 'Reag3C.exe'. Read of address 000000A9.

main thread ($348c):
005dd604 +000 Reag3C.exe   Data.DB        12492   +0 TDataSet.GetActive
01b8cfb8 +0dc Reag3C.exe   UProcRapidaCds   892  +13 TFProcRapidaCds.EProcurarChange
006afc9c +01c Reag3C.exe   Vcl.StdCtrls    3199   +2 TCustomEdit.Change
00888366 +00e Reag3C.exe   VsEdit           180   +3 TVsEdit.Change
006afe72 +01a Reag3C.exe   Vcl.StdCtrls    3290   +1 TCustomEdit.CNCommand
0068deba +2be Reag3C.exe   Vcl.Controls    7313  +91 TControl.WndProc
00692a05 +5e9 Reag3C.exe   Vcl.Controls   10143 +158 TWinControl.WndProc
0068daf4 +024 Reag3C.exe   Vcl.Controls    7091  +10 TControl.Perform
00692b6b +023 Reag3C.exe   Vcl.Controls   10212  +12 DoControlMsg
006935f7 +00b Reag3C.exe   Vcl.Controls   10487   +1 TWinControl.WMCommand
0068deba +2be Reag3C.exe   Vcl.Controls    7313  +91 TControl.WndProc
00692a05 +5e9 Reag3C.exe   Vcl.Controls   10143 +158 TWinControl.WndProc
00692024 +02c Reag3C.exe   Vcl.Controls    9850   +3 TWinControl.MainWndProc
0056b240 +014 Reag3C.exe   System.Classes            StdWndProc
770d3a7b +04b ntdll.dll                              KiUserCallbackDispatcher
768f5dee +11e USER32.dll                             SendMessageW
768f5eca +07a USER32.dll                             CallWindowProcW
00692b16 +0e6 Reag3C.exe   Vcl.Controls   10184  +30 TWinControl.DefaultHandler
006afd3b +097 Reag3C.exe   Vcl.StdCtrls    3240  +32 TCustomEdit.DefaultHandler
0068deba +2be Reag3C.exe   Vcl.Controls    7313  +91 TControl.WndProc
00692a05 +5e9 Reag3C.exe   Vcl.Controls   10143 +158 TWinControl.WndProc
0068daf4 +024 Reag3C.exe   Vcl.Controls    7091  +10 TControl.Perform
0068db0c +008 Reag3C.exe   Vcl.Controls    7161   +1 TControl.Perform
0068b7f9 +00d Reag3C.exe   Vcl.Controls    5683   +1 TControl.SetTextBuf
0068c60a +03a Reag3C.exe   Vcl.Controls    6225   +8 TControl.SetText
008845b8 +02c Reag3C.exe   VsMask           314   +2 TCustomVsMaskEdit.SetText
01b8f1e4 +02c Reag3C.exe   UProcRapidaCds  1486   +4 TFProcRapidaCds.EProcurarEnter
00693e85 +015 Reag3C.exe   Vcl.Controls   10880   +1 TWinControl.DoEnter
00694abd +039 Reag3C.exe   Vcl.Controls   11504   +6 TWinControl.CMEnter
006afeaf +033 Reag3C.exe   Vcl.StdCtrls    3297   +3 TCustomEdit.CMEnter
008853a4 +068 Reag3C.exe   VsMask           765  +12 TCustomVsMaskEdit.CMEnter
0068deba +2be Reag3C.exe   Vcl.Controls    7313  +91 TControl.WndProc
00692a05 +5e9 Reag3C.exe   Vcl.Controls   10143 +158 TWinControl.WndProc
00692024 +02c Reag3C.exe   Vcl.Controls    9850   +3 TWinControl.MainWndProc
0056b240 +014 Reag3C.exe   System.Classes            StdWndProc
770d3a7b +04b ntdll.dll                              KiUserCallbackDispatcher
768f5dee +11e USER32.dll                             SendMessageW
007c9e2c +010 Reag3C.exe   Vcl.Forms       2332   +2 SendFocusMessage
007cfdbd +1d9 Reag3C.exe   Vcl.Forms       5921  +49 TCustomForm.SetFocusedControl
006925e9 +1cd Reag3C.exe   Vcl.Controls   10012  +27 TWinControl.WndProc
00692024 +02c Reag3C.exe   Vcl.Controls    9850   +3 TWinControl.MainWndProc
0056b240 +014 Reag3C.exe   System.Classes            StdWndProc
770d3a7b +04b ntdll.dll                              KiUserCallbackDispatcher
007cfed5 +04d Reag3C.exe   Vcl.Forms       5964  +10 TCustomForm.SetWindowFocus
007cfffc +090 Reag3C.exe   Vcl.Forms       6001  +12 TCustomForm.SetActive
007d0ad2 +03a Reag3C.exe   Vcl.Forms       6384   +6 TCustomForm.WMActivate
0068deba +2be Reag3C.exe   Vcl.Controls    7313  +91 TControl.WndProc
00692a05 +5e9 Reag3C.exe   Vcl.Controls   10143 +158 TWinControl.WndProc
007cd755 +64d Reag3C.exe   Vcl.Forms       4523 +209 TCustomForm.WndProc
00692024 +02c Reag3C.exe   Vcl.Controls    9850   +3 TWinControl.MainWndProc
0056b240 +014 Reag3C.exe   System.Classes            StdWndProc
770d3a7b +04b ntdll.dll                              KiUserCallbackDispatcher
0068c847 +007 Reag3C.exe   Vcl.Controls    6387   +1 TControl.BringToFront
0108e634 +030 Reag3C.exe   BibEd            242   +4 FocaComponente
01b8f0e0 +0dc Reag3C.exe   UProcRapidaCds  1466  +21 TFProcRapidaCds.rgTipoPesquisaClick
0068e427 +073 Reag3C.exe   Vcl.Controls    7429   +9 TControl.Click
00754e3b +02f Reag3C.exe   Vcl.ExtCtrls    5975   +5 TCustomRadioGroup.ButtonClick
0068e427 +073 Reag3C.exe   Vcl.Controls    7429   +9 TControl.Click
006b552f +07f Reag3C.exe   Vcl.StdCtrls    6313  +11 TRadioButton.SetChecked
00754fc2 +076 Reag3C.exe   Vcl.ExtCtrls    6043  +12 TCustomRadioGroup.SetItemIndex
01b8c3d2 +0ce Reag3C.exe   UProcRapidaCds   733  +12 TFProcRapidaCds.FormCreate
007cc271 +031 Reag3C.exe   Vcl.Forms       3770   +3 TCustomForm.DoCreate
007cbe8d +011 Reag3C.exe   Vcl.Forms       3653   +1 TCustomForm.AfterConstruction
0040ba6d +01d Reag3C.exe   System            91   +0 @AfterConstruction
007cbe3f +19b Reag3C.exe   Vcl.Forms       3643  +35 TCustomForm.Create
007d7046 +076 Reag3C.exe   Vcl.Forms      10653  +13 TApplication.CreateForm
01b8b2d2 +082 Reag3C.exe   UProcRapidaCds   377  +12 MontaForm
01b8bce7 +13f Reag3C.exe   UProcRapidaCds   547  +42 ProcuraRapidaGetParam
01b8bd77 +047 Reag3C.exe   UProcRapidaCds   560   +2 ProcuraRapida
034cfa18 +0e4 Reag3C.exe   UFormEspCds     1424  +21 TFFormEspCds.Procurar
06a56858 +01c Reag3C.exe   uReceitPadrao    220   +2 TFrReceituarioPadrao.ProcurarSB
0108c515 +045 Reag3C.exe   uVsEditLookup    685  +11 TVsEditLookup.LookupDescricao
0108db8c +058 Reag3C.exe   uVsEditLookup   1194   +2 ValidaNaSaida
0108dc4b +04f Reag3C.exe   uVsEditLookup   1217   +7 TVsEditLookup.CNKeyDown
0068deba +2be Reag3C.exe   Vcl.Controls    7313  +91 TControl.WndProc
00692a05 +5e9 Reag3C.exe   Vcl.Controls   10143 +158 TWinControl.WndProc
00692024 +02c Reag3C.exe   Vcl.Controls    9850   +3 TWinControl.MainWndProc
0056b240 +014 Reag3C.exe   System.Classes            StdWndProc
770d3a7b +04b ntdll.dll                              KiUserCallbackDispatcher
768f5dee +11e USER32.dll                             SendMessageW
007d6bac +084 Reag3C.exe   Vcl.Forms      10442  +25 TApplication.IsKeyMsg
007d6e5b +0cf Reag3C.exe   Vcl.Forms      10528  +17 TApplication.ProcessMessage
007d6ec2 +00a Reag3C.exe   Vcl.Forms      10564   +1 TApplication.HandleMessage
007d71f5 +0c9 Reag3C.exe   Vcl.Forms      10702  +26 TApplication.Run
764205c7 +017 KERNEL32.DLL                           BaseThreadInitThunk

thread $3f5c:
747c9443 +93 KERNELBASE.dll           WaitForSingleObjectEx
747c939d +0d KERNELBASE.dll           WaitForSingleObject
004c9721 +0d Reag3C.exe     madExcept CallThreadProcSafe
004c9786 +32 Reag3C.exe     madExcept ThreadExceptFrame
764205c7 +17 KERNEL32.DLL             BaseThreadInitThunk
>> created by main thread ($348c) at:
7121602a +00 winspool.drv

thread $115c: <priority:2>
768e821f +4f USER32.dll             GetMessageA
004c9721 +0d Reag3C.exe   madExcept CallThreadProcSafe
004c9786 +32 Reag3C.exe   madExcept ThreadExceptFrame
764205c7 +17 KERNEL32.DLL           BaseThreadInitThunk
>> created by main thread ($348c) at:
72282db5 +00 winmm.dll

thread $3128 (TTransportThread):
769013d8 +48 USER32.dll                               MsgWaitForMultipleObjects
0096b85e +b6 Reag3C.exe   Datasnap.Win.SConnect       TTransportThread.Execute
004c983b +2b Reag3C.exe   madExcept                   HookedTThreadExecute
00567331 +49 Reag3C.exe   System.Classes              ThreadProc
0040d168 +28 Reag3C.exe   System                91 +0 ThreadWrapper
004c9721 +0d Reag3C.exe   madExcept                   CallThreadProcSafe
004c9786 +32 Reag3C.exe   madExcept                   ThreadExceptFrame
764205c7 +17 KERNEL32.DLL                             BaseThreadInitThunk
>> created by main thread ($348c) at:
0096b6e3 +5b Reag3C.exe   Datasnap.Win.SConnect       TTransportThread.Create

thread $413c (TThreadNotifica):
747cf3e5 +45 KERNELBASE.dll                       SleepEx
747cf38a +0a KERNELBASE.dll                       Sleep
00568215 +01 Reag3C.exe     System.Classes        TThread.Sleep
048f70a6 +56 Reag3C.exe     uThreadNotifica 59 +8 TThreadNotifica.Execute
004c983b +2b Reag3C.exe     madExcept             HookedTThreadExecute
00567331 +49 Reag3C.exe     System.Classes        ThreadProc
0040d168 +28 Reag3C.exe     System          91 +0 ThreadWrapper
004c9721 +0d Reag3C.exe     madExcept             CallThreadProcSafe
004c9786 +32 Reag3C.exe     madExcept             ThreadExceptFrame
764205c7 +17 KERNEL32.DLL                         BaseThreadInitThunk
>> created by main thread ($348c) at:
048f6fd4 +1c Reag3C.exe     uThreadNotifica 42 +1 TThreadNotifica.Create

thread $3270: <priority:1>
004c9721 +0d Reag3C.exe   madExcept CallThreadProcSafe
004c9786 +32 Reag3C.exe   madExcept ThreadExceptFrame
764205c7 +17 KERNEL32.DLL           BaseThreadInitThunk
>> created by main thread ($348c) at:
70ef1cd4 +00 MSWSOCK.DLL

thread $2094: <priority:15>
004c9721 +0d Reag3C.exe   madExcept CallThreadProcSafe
004c9786 +32 Reag3C.exe   madExcept ThreadExceptFrame
764205c7 +17 KERNEL32.DLL           BaseThreadInitThunk
>> created by main thread ($348c) at:
722835e3 +00 winmm.dll

thread $4ab4 (TThreadPool.TQueueWorkerThread):
747c9443 +093 KERNELBASE.dll                             WaitForSingleObjectEx
747c939d +00d KERNELBASE.dll                             WaitForSingleObject
004c5eb7 +1e3 Reag3C.exe     madExcept                   TIMEException.GetBugReport
004c154a +00e Reag3C.exe     madExcept                   TIMEException.GetBugReport_
06a74a71 +131 Reag3C.exe     uVsExceptionHandler 476 +14 TVsExceptionHandler.ExecutarTaskMetodo
06a74d6b +003 Reag3C.exe     uVsExceptionHandler 510  +0 TVsExceptionHandler.ExecutarTask$13$ActRec.$0$Body
0104ff31 +05d Reag3C.exe     System.Threading            TTask.Execute
01050bed +029 Reag3C.exe     System.Threading            TTask.InternalExecute
01050cf2 +062 Reag3C.exe     System.Threading            TTask.InternalWork
01050341 +01d Reag3C.exe     System.Threading            TTask.ExecuteWork
01052b4d +02d Reag3C.exe     System.Threading            TThreadPool.TQueueWorkerThread.ExecuteWorkItem
010527a3 +3d3 Reag3C.exe     System.Threading            TThreadPool.TQueueWorkerThread.Execute
004c983b +02b Reag3C.exe     madExcept                   HookedTThreadExecute
00567331 +049 Reag3C.exe     System.Classes              ThreadProc
0040d168 +028 Reag3C.exe     System               91  +0 ThreadWrapper
004c9721 +00d Reag3C.exe     madExcept                   CallThreadProcSafe
004c9786 +032 Reag3C.exe     madExcept                   ThreadExceptFrame
764205c7 +017 KERNEL32.DLL                               BaseThreadInitThunk
>> created by main thread ($348c) at:
01052193 +01f Reag3C.exe     System.Threading            TThreadPool.TBaseWorkerThread.Create

thread $1b44:
764205c7 +17 KERNEL32.DLL  BaseThreadInitThunk

modules:
00400000 Reag3C.exe                    4.0.2409.1030       C:\Viasoft\Client\Agro
0c650000 PcScale.dll                   4.0.2.2             C:\Viasoft\Client\Agro
0c830000 ScriptControl32_20805.dll     7.36.20805.0        C:\Windows\System32
10000000 LZ32.DLL                      5.0.1.1             C:\Windows\SYSTEM32
13fe0000 ssleay32.dll                  1.0.1.7             C:\Viasoft\Client\Dlls
14250000 libeay32.dll                  1.0.1.7             C:\Viasoft\Client\Dlls
46480000 security.dll                  6.2.17763.1         C:\Windows\SYSTEM32
50030000 borlndmm.dll                  24.0.25048.9432     C:\Viasoft\Client\Agro
6cfb0000 ntshrui.dll                   6.2.17763.2989      C:\Windows\SYSTEM32
6d060000 LINKINFO.dll                  6.2.17763.1         C:\Windows\SYSTEM32
6d070000 RMCLIENT.dll                  6.2.17763.1697      C:\Windows\system32
6d090000 twinapi.appcore.dll           6.2.17763.2989      C:\Windows\system32
6d240000 dxgi.dll                      6.2.17763.2989      C:\Windows\system32
6d2f0000 dcomp.dll                     6.2.17763.2989      C:\Windows\system32
6d450000 d3d11.dll                     6.2.17763.3469      C:\Windows\system32
6d680000 dataexchange.dll              6.2.17763.2989      C:\Windows\system32
6d6d0000 msls31.dll                    3.10.349.0          C:\Windows\SYSTEM32
6d710000 RICHED20.DLL                  5.31.23.1231        C:\Windows\SYSTEM32
6d790000 CoreMessaging.dll             6.2.17763.2931      C:\Windows\System32
6d820000 CoreUIComponents.dll          6.2.17763.1554      C:\Windows\System32
6da90000 TextInputFramework.dll        6.2.17763.2989      C:\Windows\System32
6db10000 sk4d.dll                                          C:\Viasoft\Client\Dlls
6ed30000 explorerframe.dll             6.2.17763.2989      C:\Windows\system32
6f250000 softpub.dll                   6.2.17763.1         C:\Windows\SYSTEM32
6f260000 WebView2Loader_x86.dll        1.0.1108.44         C:\Viasoft\Client\Dlls
6f280000 c_iscii.dll                   6.2.17763.1         C:\Windows\system32
6f290000 c_g18030.dll                  6.2.17763.1         C:\Windows\system32
6f2d0000 adsldpc.dll                   6.2.17763.1971      C:\Windows\SYSTEM32
6f310000 opengl32.dll                  6.2.17763.1         C:\Windows\SYSTEM32
6f450000 WindowsCodecs.dll             6.2.17763.2989      C:\Windows\SYSTEM32
6f9a0000 MSVFW32.dll                   6.2.17763.1         C:\Windows\SYSTEM32
6f9d0000 usp10.dll                     6.2.17763.1817      C:\Windows\SYSTEM32
6f9f0000 olepro32.dll                  6.2.17763.2931      C:\Windows\SYSTEM32
6fa10000 oledlg.dll                    6.2.17763.2989      C:\Windows\SYSTEM32
6fa40000 oleacc.dll                    7.2.17763.1697      C:\Windows\SYSTEM32
6faa0000 glu32.dll                     6.2.17763.1         C:\Windows\SYSTEM32
6fae0000 FONTSUB.dll                   6.2.17763.3469      C:\Windows\SYSTEM32
6fb00000 cryptui.dll                   6.2.17763.3532      C:\Windows\SYSTEM32
6fdb0000 Windows.StateRepositoryPS.dll 6.2.17763.557       C:\Windows\System32
6fe40000 AVICAP32.DLL                  6.2.17763.1         C:\Windows\SYSTEM32
6ff50000 rasadhlp.dll                  6.2.17763.1         C:\Windows\System32
6ff60000 wshbth.dll                    6.2.17763.1         C:\Windows\system32
6ff70000 NLAapi.dll                    6.2.17763.134       C:\Windows\system32
6ff90000 winrnr.dll                    6.2.17763.1         C:\Windows\System32
6ffa0000 napinsp.dll                   6.2.17763.1         C:\Windows\system32
70050000 dhcpcsvc.DLL                  6.2.17763.3532      C:\Windows\SYSTEM32
70070000 dhcpcsvc6.DLL                 6.2.17763.3532      C:\Windows\SYSTEM32
70090000 IdnDL.dll                     6.2.17763.1         C:\Windows\SYSTEM32
700a0000 Fwpuclnt.dll                  6.2.17763.3887      C:\Windows\SYSTEM32
70100000 dwmapi.dll                    6.2.17763.2989      C:\Windows\system32
70130000 wininet.dll                   11.0.17763.3469     C:\Windows\SYSTEM32
70720000 uxtheme.dll                   6.2.17763.3532      C:\Windows\system32
707a0000 wintypes.dll                  6.2.17763.3887      C:\Windows\SYSTEM32
70880000 dbgcore.DLL                   6.2.17763.1         C:\Windows\SYSTEM32
708b0000 WINSTA.dll                    6.2.17763.771       C:\Windows\SYSTEM32
70900000 wtsapi32.dll                  6.2.17763.1         C:\Windows\SYSTEM32
709e0000 dbghelp.dll                   6.2.17763.1999      C:\Windows\SYSTEM32
70b70000 FaultRep.dll                  6.2.17763.3770      C:\Windows\SYSTEM32
70bd0000 cscapi.dll                    6.2.17763.404       C:\Windows\SYSTEM32
70be0000 CLDAPI.dll                    6.2.17763.2931      C:\Windows\SYSTEM32
70cb0000 FLTLIB.DLL                    6.2.17763.1         C:\Windows\SYSTEM32
70e40000 DNSAPI.dll                    6.2.17763.2989      C:\Windows\SYSTEM32
70ee0000 MSWSOCK.DLL                   6.2.17763.1192      C:\Windows\SYSTEM32
71090000 wkscli.dll                    6.2.17763.2803      C:\Windows\SYSTEM32
710b0000 wsock32.dll                   6.2.17763.1         C:\Windows\SYSTEM32
710c0000 comctl32.dll                  5.82.17763.3887     C:\Windows\WinSxS\x86_microsoft.windows.common-controls_6595b64144ccf1df_5.82.17763.3887_none_b4b8950b6e715f13
71150000 netapi32.dll                  6.2.17763.3532      C:\Windows\SYSTEM32
71170000 SHFolder.dll                  6.2.17763.1         C:\Windows\SYSTEM32
71180000 ntmarta.dll                   6.2.17763.1         C:\Windows\SYSTEM32
711f0000 winspool.drv                  6.2.17763.3650      C:\Windows\SYSTEM32
71260000 mpr.dll                       6.2.17763.404       C:\Windows\SYSTEM32
71ce0000 msimg32.dll                   6.2.17763.1         C:\Windows\SYSTEM32
71cf0000 SECUR32.DLL                   6.2.17763.1         C:\Windows\SYSTEM32
71d90000 winhttp.dll                   6.2.17763.3469      C:\Windows\SYSTEM32
71e60000 iphlpapi.dll                  6.2.17763.2989      C:\Windows\SYSTEM32
71ea0000 gdiplus.dll                   6.2.17763.3887      C:\Windows\WinSxS\x86_microsoft.windows.gdiplus_6595b64144ccf1df_1.1.17763.3887_none_570d71bac2565b3c
72010000 rsaenh.dll                    6.2.17763.1999      C:\Windows\system32
72040000 comctl32.dll                  6.10.17763.3887     C:\Windows\WinSxS\x86_microsoft.windows.common-controls_6595b64144ccf1df_6.0.17763.3887_none_26227ed567c3e16e
72250000 WINMMBASE.dll                 6.2.17763.1         C:\Windows\SYSTEM32
72280000 winmm.dll                     6.2.17763.1         C:\Windows\SYSTEM32
722b0000 netutils.dll                  6.2.17763.1         C:\Windows\SYSTEM32
722c0000 srvcli.dll                    6.2.17763.2803      C:\Windows\SYSTEM32
736f0000 iertutil.dll                  11.0.17763.3532     C:\Windows\SYSTEM32
73920000 URLMON.DLL                    11.0.17763.3650     C:\Windows\SYSTEM32
73ae0000 edputil.dll                   6.2.17763.1         C:\Windows\SYSTEM32
743b0000 version.dll                   6.2.17763.1         C:\Windows\SYSTEM32
743c0000 PROPSYS.dll                   7.0.17763.2989      C:\Windows\SYSTEM32
745d0000 mscoree.dll                   6.2.17763.1         C:\Windows\SYSTEM32
74630000 c_is2022.dll                  6.2.17763.1         C:\Windows\system32
74640000 activeds.dll                  6.2.17763.1697      C:\Windows\SYSTEM32
74680000 CRYPTBASE.dll                 6.2.17763.1         C:\Windows\System32
74690000 SspiCli.dll                   6.2.17763.3532      C:\Windows\System32
746b0000 KERNELBASE.dll                6.2.17763.3887      C:\Windows\System32
748c0000 kernel.appcore.dll            6.2.17763.1         C:\Windows\System32
748d0000 RPCRT4.dll                    6.2.17763.3887      C:\Windows\System32
74990000 advapi32.dll                  6.2.17763.3532      C:\Windows\System32
74a10000 IMM32.DLL                     6.2.17763.719       C:\Windows\System32
74a40000 WINTRUST.dll                  6.2.17763.3887      C:\Windows\System32
74a90000 NSI.dll                       6.2.17763.1554      C:\Windows\System32
74aa0000 ole32.dll                     6.2.17763.2989      C:\Windows\System32
74ba0000 gdi32full.dll                 6.2.17763.3770      C:\Windows\System32
74d10000 crypt32.dll                   6.2.17763.3650      C:\Windows\System32
74ed0000 windows.storage.dll           6.2.17763.3532      C:\Windows\System32
75560000 GDI32.dll                     6.2.17763.3532      C:\Windows\System32
75590000 win32u.dll                    6.2.17763.1         C:\Windows\System32
755b0000 sechost.dll                   6.2.17763.2989      C:\Windows\System32
75a80000 oleaut32.dll                  6.2.17763.1935      C:\Windows\System32
75b20000 combase.dll                   6.2.17763.3887      C:\Windows\System32
75da0000 bcrypt.dll                    6.2.17763.3887      C:\Windows\System32
75dc0000 msvcp_win.dll                 6.2.17763.1         C:\Windows\System32
75e40000 powrprof.dll                  6.2.17763.1         C:\Windows\System32
75ea0000 SHELL32.dll                   6.2.17763.3887      C:\Windows\System32
76400000 KERNEL32.DLL                  6.2.17763.3887      C:\Windows\System32
764e0000 IMAGEHLP.DLL                  6.2.17763.1         C:\Windows\System32
76500000 MSASN1.dll                    6.2.17763.3650      C:\Windows\System32
76510000 cryptsp.dll                   6.2.17763.3650      C:\Windows\System32
76530000 profapi.dll                   6.2.17763.2989      C:\Windows\System32
765b0000 psapi.dll                     6.2.17763.1         C:\Windows\System32
765c0000 shcore.dll                    6.2.17763.2989      C:\Windows\System32
76650000 comdlg32.dll                  6.2.17763.3469      C:\Windows\System32
768c0000 USER32.dll                    6.2.17763.3887      C:\Windows\System32
76a60000 clbcatq.dll                   2001.12.10941.16384 C:\Windows\System32
76af0000 WLDAP32.dll                   6.2.17763.3406      C:\Windows\System32
76b50000 msvcrt.dll                    7.0.17763.475       C:\Windows\System32
76c10000 bcryptPrimitives.dll          6.2.17763.3887      C:\Windows\System32
76c80000 coml2.dll                     6.2.17763.2989      C:\Windows\System32
76ce0000 ucrtbase.dll                  6.2.17763.1490      C:\Windows\System32
76e10000 cfgmgr32.dll                  6.2.17763.1         C:\Windows\System32
76e50000 ws2_32.dll                    6.2.17763.2028      C:\Windows\System32
76eb0000 Normaliz.dll                  6.2.17763.1         C:\Windows\System32
76ec0000 SHLWAPI.dll                   6.2.17763.3469      C:\Windows\System32
76f10000 MSCTF.dll                     6.2.17763.2989      C:\Windows\System32
77060000 ntdll.dll                     6.2.17763.3887      C:\Windows\SYSTEM32

processes:
0000 Idle                                                          0  0   0
0004 System                                                        0  0   0
0054 Registry                                                      0  0   0
01b8 smss.exe                                                      0  0   0
0260 csrss.exe                                                     0  0   0
02ac csrss.exe                                                     1  0   0
02c0 wininit.exe                                                   0  0   0
02f0 winlogon.exe                                                  1  0   0
0334 services.exe                                                  0  0   0
0348 lsass.exe                                                     0  0   0
03b4 svchost.exe                                                   0  0   0
03c8 svchost.exe                                                   0  0   0
03e0 fontdrvhost.exe                                               0  0   0
03dc fontdrvhost.exe                                               1  0   0
01f0 svchost.exe                                                   0  0   0
025c svchost.exe                                                   0  0   0
02a4 dwm.exe                                                       1  0   0
0440 svchost.exe                                                   0  0   0
046c svcmain.exe                                                   0  0   0
0490 svchost.exe                                                   0  0   0
0498 svchost.exe                                                   0  0   0
04a8 svchost.exe                                                   0  0   0
04c8 svchost.exe                                                   0  0   0
04e8 svchost.exe                                                   0  0   0
052c svchost.exe                                                   0  0   0
055c svchost.exe                                                   0  0   0
0564 svchost.exe                                                   0  0   0
056c svchost.exe                                                   0  0   0
060c svchost.exe                                                   0  0   0
0634 svchost.exe                                                   0  0   0
06c8 svchost.exe                                                   0  0   0
06f0 svchost.exe                                                   0  0   0
06fc svchost.exe                                                   0  0   0
070c svchost.exe                                                   0  0   0
079c svchost.exe                                                   0  0   0
07a8 svchost.exe                                                   0  0   0
07b4 svchost.exe                                                   0  0   0
0608 svchost.exe                                                   0  0   0
069c svchost.exe                                                   0  0   0
080c svchost.exe                                                   0  0   0
086c svchost.exe                                                   0  0   0
0874 svchost.exe                                                   0  0   0
08d4 svchost.exe                                                   0  0   0
0924 svchost.exe                                                   0  0   0
0938 svchost.exe                                                   0  0   0
0984 svchost.exe                                                   0  0   0
0990 svchost.exe                                                   0  0   0
0a34 svchost.exe                                                   0  0   0
0aec svchost.exe                                                   0  0   0
0bd8 spoolsv.exe                                                   0  0   0
0a94 AnyDesk.exe                                                   0  0   0
019c svchost.exe                                                   0  0   0
083c svcac.exe                                                     0  0   0
0b2c APSC.exe                                                      0  0   0
0b90 svchost.exe                                                   0  0   0
0c40 svchost.exe                                                   0  0   0
0c64 Everything.exe                                                0  0   0
0c6c elastic-agent.exe                                             0  0   0
0c80 fb_inet_server.exe                                            0  0   0
0cdc svchost.exe                                                   0  0   0
0ce4 IpOverUsbSvc.exe                                              0  0   0
0de0 VirtIOSrv_64.exe                                              0  0   0
0e20 nfsclnt.exe                                                   0  0   0
0e7c svchost.exe                                                   0  0   0
0e8c svcenterprise.exe                                             0  0   0
0e98 svchost.exe                                                   0  0   0
0ea0 svcweb.exe                                                    0  0   0
0ed4 svchost.exe                                                   0  0   0
0edc svchost.exe                                                   0  0   0
0ee8 ViasoftServidorReagRESTServico.exe                            0  0   0
0ef0 ViasoftServerLicense.exe                                      0  0   0
0f14 svchost.exe                                                   0  0   0
0ff0 svchost.exe                                                   0  0   0
0ae8 zabbix_agent2.exe                                             0  0   0
0e78 zabbix_agent2.exe                                             0  0   0
1068 svchost.exe                                                   0  0   0
1254 OracleCloudAgent.exe                                          0  0   0
125c OracleCloudAgentUpdater.exe                                   0  0   0
1290 svcr.exe                                                      0  0   0
12f4 WmiPrvSE.exe                                                  0  0   0
13fc svchost.exe                                                   0  0   0
144c dllhost.exe                                                   0  0   0
1654 svchost.exe                                                   0  0   0
17e4 svchost.exe                                                   0  0   0
0cb4 svchost.exe                                                   0  0   0
19c8 winexec.exe                                                   0  0   0
1a94 HTML5service.exe                                              0  0   0
1aa4 conhost.exe                                                   0  0   0
19ac conhost.exe                                                   0  0   0
1a3c gomon.exe                                                     0  0   0
1660 filebeat.exe                                                  0  0   0
012c filebeat.exe                                                  0  0   0
1bb4 filebeat.exe                                                  0  0   0
13a4 metricbeat.exe                                                0  0   0
13a8 metricbeat.exe                                                0  0   0
1780 metricbeat.exe                                                0  0   0
18fc winexec.exe                                                   0  0   0
1aac sihost.exe                                                    1  0   0
1168 conhost.exe                                                   0  0   0
18e0 svchost.exe                                                   1  0   0
190c svchost.exe                                                   1  0   0
1a4c svchost.exe                                                   0  0   0
1b68 taskhostw.exe                                                 1  0   0
1c64 svchost.exe                                                   0  0   0
1c74 oci-vulnerabilityscan.exe                                     0  0   0
1cb4 ctfmon.exe                                                    1  0   0
1d44 svchost.exe                                                   0  0   0
1dac explorer.exe                                                  1  0   0
1e54 svchost.exe                                                   0  0   0
1f1c conhost.exe                                                   0  0   0
1f54 conhost.exe                                                   0  0   0
1f6c conhost.exe                                                   0  0   0
1f74 conhost.exe                                                   0  0   0
1f7c conhost.exe                                                   0  0   0
1f8c conhost.exe                                                   0  0   0
016c ShellExperienceHost.exe                                       1  0   0
1f70 SearchUI.exe                                                  1  0   0
1430 RuntimeBroker.exe                                             1  0   0
146c osms.exe                                                      0  0   0
1eb8 RuntimeBroker.exe                                             1  0   0
203c osms.exe                                                      0  0   0
2044 conhost.exe                                                   0  0   0
2290 runcommand.exe                                                0  0   0
22b8 RuntimeBroker.exe                                             1  0   0
2348 smartscreen.exe                                               1  0   0
1eb0 unifiedmonitoring.exe                                         0  0   0
16c4 Everything.exe                                                1  0   0
0bc0 AnyDesk.exe                                                   1  0   0   normal
1f18 jusched.exe                                                   1  0   0
02f8 svchost.exe                                                   0  0   0
0d3c msdtc.exe                                                     0  0   0
22c0 telegraf.exe                                                  0  0   0
23d8 svchost.exe                                                   0  0   0
1c84 svchost.exe                                                   0  0   0
17ec jucheck.exe                                                   1  0   0
1020 svchost.exe                                                   0  0   0
0b0c svchost.exe                                                   0  0   0
24a0 svchost.exe                                                   0  0   0
0890 svchost.exe                                                   0  0   0
1c28 svchost.exe                                                   0  0   0
04b8 svchost.exe                                                   0  0   0
0be4 SecurityHealthService.exe                                     0  0   0
3ef0 CSFalconService.exe                                           0  0   0
3c50 CSFalconContainer.exe                                         0  0   0
3f04 CSFalconContainer.exe                                         0  0   0
3770 CSFalconContainer.exe                                         0  0   0
3308 CSFalconContainer.exe                                         0  0   0
2af4 nssm.exe                                                      0  0   0
3958 MpDefenderCoreService.exe                                     0  0   0
1984 MsMpEng.exe                                                   0  0   0
3ddc NisSrv.exe                                                    0  0   0
3bcc csrss.exe                                                     22 0   0
1f80 winlogon.exe                                                  22 0   0
340c fontdrvhost.exe                                               22 0   0
3bc0 dwm.exe                                                       22 0   0
42bc rdpclip.exe                                                   22 0   0   normal       C:\Windows\System32
1e00 sihost.exe                                                    22 0   0   normal       C:\Windows\System32
4274 svchost.exe                                                   22 0   0   normal       C:\Windows\System32
4118 svchost.exe                                                   22 0   0   normal       C:\Windows\System32
2054 taskhostw.exe                                                 22 0   0   normal       C:\Windows\System32
3438 ctfmon.exe                                                    22 0   0
1f24 universalprinter.exe                                          22 0   0   normal       C:\Program Files (x86)\TSplus\UserDesktop\files
2e64 svcr.exe                                                      22 0   0   normal       C:\Program Files (x86)\TSplus\UserDesktop\files
3a64 explorer.exe                                                  22 0   0   normal       C:\Windows
2724 ShellExperienceHost.exe                                       22 0   0   normal       C:\Windows\SystemApps\ShellExperienceHost_cw5n1h2txyewy
2bd4 SearchUI.exe                                                  22 0   0   normal       C:\Windows\SystemApps\Microsoft.Windows.Cortana_cw5n1h2txyewy
29c8 RuntimeBroker.exe                                             22 0   0   normal       C:\Windows\System32
3ba4 RuntimeBroker.exe                                             22 0   0   normal       C:\Windows\System32
176c smartscreen.exe                                               22 0   0   normal       C:\Windows\System32
2470 VsScktSrvr.exe                                                22 0   0   normal       C:\Users\reag.user\Desktop
263c Reag3C.exe                                                    22 0   0   normal       C:\Viasoft\Client\Agro
23fc RuntimeBroker.exe                                             22 0   0   normal       C:\Windows\System32
3ca8 Everything.exe                                                22 0   0   normal       C:\Program Files\Everything
16b0 AnyDesk.exe                                                   22 0   0   normal       C:\Program Files (x86)\AnyDesk
3a58 jusched.exe                                                   22 0   0   normal       C:\Program Files (x86)\Common Files\Java\Java Update
1330 splwow64.exe                                                  22 0   0   normal       C:\Windows
0d2c svchost.exe                                                   22 0   0   normal       C:\Windows\System32
29dc ViasoftServerAgro.exe                                         22 0   0   normal       C:\Viasoft\Server\Agro
37dc jucheck.exe                                                   22 0   0   normal       C:\Program Files (x86)\Common Files\Java\Java Update
0598 dbeaver.exe                                                   22 0   0   normal       C:\Program Files\DBeaver
2518 svchost.exe                                                   0  0   0
1ed4 csrss.exe                                                     24 0   0
2788 winlogon.exe                                                  24 0   0
2658 dwm.exe                                                       24 0   0
25d8 fontdrvhost.exe                                               24 0   0
35dc rdpclip.exe                                                   24 2   30  normal       C:\Windows\System32
32b8 sihost.exe                                                    24 0   11  normal       C:\Windows\System32
22d0 svchost.exe                                                   24 0   1   normal       C:\Windows\System32
3358 svchost.exe                                                   24 0   4   normal       C:\Windows\System32
2880 taskhostw.exe                                                 24 0   2   normal       C:\Windows\System32
1274 ctfmon.exe                                                    24 0   0
2a90 universalprinter.exe                                          24 0   1   normal       C:\Program Files (x86)\TSplus\UserDesktop\files
418c svcr.exe                                                      24 27  12  normal       C:\Program Files (x86)\TSplus\UserDesktop\files
3268 explorer.exe                                                  24 186 210 normal       C:\Windows
0dc8 ShellExperienceHost.exe                                       24 7   32  normal       C:\Windows\SystemApps\ShellExperienceHost_cw5n1h2txyewy
2c20 SearchUI.exe                                                  24 13  28  normal       C:\Windows\SystemApps\Microsoft.Windows.Cortana_cw5n1h2txyewy
2e44 RuntimeBroker.exe                                             24 40  3   normal       C:\Windows\System32
4040 RuntimeBroker.exe                                             24 36  1   normal       C:\Windows\System32
248c RuntimeBroker.exe                                             24 8   3   normal       C:\Windows\System32
1bec smartscreen.exe                                               24 0   3   normal       C:\Windows\System32
1c30 Everything.exe                                                24 47  10  normal       C:\Program Files\Everything
2450 AnyDesk.exe                                                   24 189 18  normal       C:\Program Files (x86)\AnyDesk
3160 jusched.exe                                                   24 0   2   normal       C:\Program Files (x86)\Common Files\Java\Java Update
0104 jucheck.exe                                                   24 7   6   normal       C:\Program Files (x86)\Common Files\Java\Java Update
018c Reag3C.exe                                                    24 775 412 normal       C:\Viasoft\Client\Agro
32dc splwow64.exe                                                  24 0   2   normal       C:\Windows
316c svchost.exe                                                   24 0   1   normal       C:\Windows\System32
3488 ViasoftServerAgro.exe                                         22 0   0   normal       C:\Viasoft\Server\Agro
271c taskhostw.exe                                                 1  0   0
1418 Code.exe                                                      24 30  47  normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
28bc Code.exe                                                      24 0   4   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
3604 Code.exe                                                      24 4   2   above normal C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
3d78 Code.exe                                                      24 0   3   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
12f0 Code.exe                                                      24 0   0   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
433c Code.exe                                                      24 0   3   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
10b8 Code.exe                                                      24 0   3   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
3448 Code.exe                                                      24 0   3   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
3934 Code.exe                                                      24 0   3   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
1f10 conhost.exe                                                   24 0   5   normal       C:\Windows\System32
0f8c powershell.exe                                                24 0   4   normal       C:\Windows\System32\WindowsPowerShell\v1.0
07c0 Code.exe                                                      24 0   1   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
38fc Code.exe                                                      24 0   1   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
21fc Code.exe                                                      24 0   1   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
29c4 Code.exe                                                      24 0   1   normal       C:\Users\reag.user\AppData\Local\Programs\Microsoft VS Code
149c conhost.exe                                                   24 0   5   normal       C:\Windows\System32
19ec powershell.exe                                                24 0   4   normal       C:\Windows\System32\WindowsPowerShell\v1.0
2684 csrss.exe                                                     25 0   0
3e5c winlogon.exe                                                  25 0   0
38b0 dwm.exe                                                       25 0   0
3708 fontdrvhost.exe                                               25 0   0
4304 rdpclip.exe                                                   25 0   0   normal       C:\Windows\System32
2820 sihost.exe                                                    25 0   0   normal       C:\Windows\System32
32e8 svchost.exe                                                   25 0   0   normal       C:\Windows\System32
290c svchost.exe                                                   25 0   0   normal       C:\Windows\System32
4348 taskhostw.exe                                                 25 0   0   normal       C:\Windows\System32
448c ctfmon.exe                                                    25 0   0
478c universalprinter.exe                                          25 0   0   normal       C:\Program Files (x86)\TSplus\UserDesktop\files
47cc svcr.exe                                                      25 0   0   normal       C:\Program Files (x86)\TSplus\UserDesktop\files
2be0 explorer.exe                                                  25 0   0   normal       C:\Windows
436c ShellExperienceHost.exe                                       25 0   0   normal       C:\Windows\SystemApps\ShellExperienceHost_cw5n1h2txyewy
25d4 SearchUI.exe                                                  25 0   0   normal       C:\Windows\SystemApps\Microsoft.Windows.Cortana_cw5n1h2txyewy
325c RuntimeBroker.exe                                             25 0   0   normal       C:\Windows\System32
4768 RuntimeBroker.exe                                             25 0   0   normal       C:\Windows\System32
0244 smartscreen.exe                                               25 0   0   normal       C:\Windows\System32
4500 Reag3C.exe                                                    25 0   0   normal       C:\Viasoft\Client\Agro
45f0 splwow64.exe                                                  25 0   0   normal       C:\Windows
49e4 RuntimeBroker.exe                                             25 0   0   normal       C:\Windows\System32
4a40 Everything.exe                                                25 0   0   normal       C:\Program Files\Everything
4a8c svchost.exe                                                   25 0   0   normal       C:\Windows\System32
49d8 jusched.exe                                                   25 0   0   normal       C:\Program Files (x86)\Common Files\Java\Java Update
19c0 AnyDesk.exe                                                   25 0   0   normal       C:\Program Files (x86)\AnyDesk
49f0 ViasoftServerAgro.exe                                         22 0   0   normal       C:\Viasoft\Server\Agro
4458 MonitorDeMensagens.exe                                        25 0   0   normal       C:\Viasoft\Client\Agro
4808 ViasoftServerAgroXE.exe                                       25 0   0   normal       C:\Viasoft\Server\AgroXE
4b68 ViasoftServerDFE.exe                                          25 0   0   normal       C:\Viasoft\Server\DFe
493c powershell.exe                                                24 0   0
4994 conhost.exe                                                   24 0   0
4bc4 jucheck.exe                                                   25 0   0   normal       C:\Program Files (x86)\Common Files\Java\Java Update
2df4 dbeaver.exe                                                   24 752 708 normal       C:\Program Files\DBeaver
4acc HelpPane.exe                                                  25 0   0   normal       C:\Windows
4200 CodeSetup-stable-f6cfa2ea2403534de03f069bdf160d06451ed282.exe 24 0   3   normal       C:\Users\REAG~1.USE\AppData\Local\Temp\24\vscode-stable-user-x64
19f8 CodeSetup-stable-f6cfa2ea2403534de03f069bdf160d06451ed282.tmp 24 77  59  normal       C:\Users\REAG~1.USE\AppData\Local\Temp\24\is-CEJCD.tmp
44a4 svchost.exe                                                   0  0   0
017c nssm.exe                                                      0  0   0
3374 conhost.exe                                                   0  0   0
0e74 node.exe                                                      0  0   0

hardware:
+ {1ed2bbf9-11f0-4084-b21f-ad83a8e6dcdc}
  - Fax (redirected 24)
  - Microsoft Print to PDF
  - Microsoft Print to PDF (redirected 24)
  - Microsoft XPS Document Writer
  - Microsoft XPS Document Writer (redirected 24)
  - OneNote for Windows 10 (redirected 24)
  - Root Print Queue
  - Universal Printer
+ {36fc9e60-c465-11cf-8056-444553540000}
  - Intel(R) 82371SB PCI to USB Universal Host Controller
  - USB Root Hub
+ {4d36e966-e325-11ce-bfc1-08002be10318}
  - ACPI x64-based PC
+ {4d36e967-e325-11ce-bfc1-08002be10318}
  - ORACLE BlockVolume SCSI Disk Device
+ {4d36e968-e325-11ce-bfc1-08002be10318}
  - Microsoft Basic Display Adapter
+ {4d36e969-e325-11ce-bfc1-08002be10318}
  - Standard floppy disk controller
+ {4d36e96a-e325-11ce-bfc1-08002be10318}
  - Intel(R) 82371SB PCI Bus Master IDE Controller
+ {4d36e96b-e325-11ce-bfc1-08002be10318}
  - Remote Desktop Keyboard Device
  - Standard PS/2 Keyboard
+ {4d36e96e-e325-11ce-bfc1-08002be10318}
  - Generic Non-PnP Monitor
+ {4d36e96f-e325-11ce-bfc1-08002be10318}
  - HID-compliant mouse
  - PS/2 Compatible Mouse
  - Remote Desktop Mouse Device
+ {4d36e972-e325-11ce-bfc1-08002be10318}
  - Microsoft Kernel Debug Network Adapter
  - Oracle VirtIO Ethernet Adapter (driver 1.1.2.100)
  - WAN Miniport (GRE)
  - WAN Miniport (IKEv2)
  - WAN Miniport (IP)
  - WAN Miniport (IPv6)
  - WAN Miniport (L2TP)
  - WAN Miniport (Network Monitor)
  - WAN Miniport (PPPOE)
  - WAN Miniport (PPTP)
  - WAN Miniport (SSTP)
+ {4d36e978-e325-11ce-bfc1-08002be10318}
  - Communications Port (COM1)
+ {4d36e97b-e325-11ce-bfc1-08002be10318}
  - Microsoft iSCSI Initiator
  - Microsoft Storage Spaces Controller
  - Oracle VirtIO SCSI pass-through controller (driver 1.1.5.100)
+ {4d36e97d-e325-11ce-bfc1-08002be10318}
  - ACPI Fixed Feature Button
  - ACPI Processor Container Device
  - Composite Bus Enumerator
  - CPU to PCI Bridge
  - CrowdStrike Device Control Sensor Interface (driver 7.10.18054.0)
  - CrowdStrike Firmware Analysis Sensor Interface (driver 7.14.18453.0)
  - Extended IO Bus
  - Extended IO Bus
  - Extended IO Bus
  - High precision event timer
  - Microsoft ACPI-Compliant System
  - Microsoft Basic Display Driver
  - Microsoft Basic Render Driver
  - Microsoft System Management BIOS Driver
  - Microsoft Virtual Drive Enumerator
  - NDIS Virtual Network Adapter Enumerator
  - PCI Bus
  - PCI to ISA Bridge
  - Plug and Play Software Device Enumerator
  - QEMU PVPanic Device (driver 1.1.2.100)
  - Remote Desktop Device Redirector Bus
  - System CMOS/real time clock
  - UMBus Enumerator
  - UMBus Root Bus Enumerator
  - Volume Manager
+ {50127dc3-0f36-415e-a6cc-4cb3be910b65}
  - AMD EPYC 7J13 64-Core Processor
  - AMD EPYC 7J13 64-Core Processor
+ {62f9c741-b25a-46ce-b54c-9bccce08b6f2}
  - Microsoft GS Wavetable Synth
  - Microsoft Radio Device Enumeration Bus
  - Microsoft RRAS Root Enumerator
+ {745a17a0-74d3-11d0-b6fe-00a0c90f57da}
  - USB Input Device
+ {c166523c-fe0c-4a94-a586-f1a80cfbbf3e}
  - Remote Audio

cpu registers:
eax = 00000000
ebx = 00000000
ecx = fffffff8
edx = 00000000
esi = 006959c4
edi = 1106d340
eip = 005dd604
esp = 0019ddf8
ebp = 0019de2c

stack dump:
0019ddf8  bd cf b8 01 78 e1 19 00 - 1c c8 40 00 2c de 19 00  ....x.....@.,...
0019de08  40 d3 06 11 58 83 88 00 - 40 d3 06 11 00 00 00 00  @...X...@.......
0019de18  00 00 00 00 00 00 00 00 - 00 00 00 00 c0 4f 08 0e  .............O..
0019de28  00 00 00 00 70 df 19 00 - a2 fc 6a 00 40 d3 06 11  ....p.....j.@...
0019de38  6b 83 88 00 c8 df 19 00 - 77 fe 6a 00 40 d3 06 11  k.......w.j.@...
0019de48  bd de 68 00 40 d3 06 11 - a8 e1 19 00 40 d3 06 11  ..h.@.......@...
0019de58  00 00 00 00 00 00 00 00 - 00 00 00 00 00 00 00 00  ................
0019de68  00 00 00 00 00 00 00 00 - 00 00 00 00 f4 ff ff ff  ................
0019de78  00 00 00 00 00 00 00 00 - 00 00 00 00 90 01 00 00  ................
0019de88  00 00 00 01 00 00 00 00 - 53 00 65 00 67 00 6f 00  ........S.e.g.o.
0019de98  65 00 20 00 55 00 49 00 - 00 00 00 00 00 00 00 00  e. .U.I.........
0019dea8  00 00 00 00 00 00 00 00 - 00 00 00 00 00 00 00 00  ................
0019deb8  00 00 00 00 00 00 00 00 - 00 00 00 00 00 00 00 00  ................
0019dec8  00 00 00 00 00 00 00 00 - f4 ff ff ff 00 00 00 00  ................
0019ded8  00 00 00 00 00 00 00 00 - 90 01 00 00 00 00 00 01  ................
0019dee8  00 00 00 00 53 00 65 00 - 67 00 6f 00 65 00 20 00  ....S.e.g.o.e. .
0019def8  55 00 49 00 00 00 00 00 - 00 00 00 00 00 00 00 00  U.I.............
0019df08  00 00 00 00 00 00 00 00 - 00 00 00 00 00 00 00 00  ................
0019df18  00 00 00 00 00 00 00 00 - 00 00 00 00 00 00 00 00  ................
0019df28  00 00 00 00 00 00 00 00 - 12 00 00 00 ba ff ff ff  ................

disassembling:
005dd604       public Data.DB.TDataSet.GetActive:  ; function entry point
005dd604 12492 > movzx   eax, byte ptr [eax+$a9]
005dd60b         test    al, al
005dd60d         jz      loc_5dd618
005dd60f         sub     al, $c
005dd611         jz      loc_5dd618
[...]