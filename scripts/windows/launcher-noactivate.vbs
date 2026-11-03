' HGR launcher bridge: run the existing CMD script without activating the console.
' Mode 4 is SW_SHOWNOACTIVATE: another application keeps keyboard focus.
' This is for short, noninteractive Start/Restart/Close/Update launchers.
Option Explicit
Dim shell, filesystem, scriptPath, q, command
If WScript.Arguments.Count <> 1 Then WScript.Quit 64
Set shell = CreateObject("WScript.Shell")
Set filesystem = CreateObject("Scripting.FileSystemObject")
scriptPath = WScript.Arguments(0)
If Not filesystem.FileExists(scriptPath) Then WScript.Quit 2
q = Chr(34)
command = q & shell.ExpandEnvironmentStrings("%ComSpec%") & q & " /d /c " & q & q & scriptPath & q & q
shell.Run command, 4, False
