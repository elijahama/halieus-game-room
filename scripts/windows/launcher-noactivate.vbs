' HGR launcher bridge: run the existing CMD script with no console window.
' Mode 0 is SW_HIDE: no terminal window is displayed.
' This is for short, noninteractive Start/Restart/Close/Update/Recovery launchers.
Option Explicit
Dim shell, filesystem, scriptPath, q, command
If WScript.Arguments.Count <> 1 Then WScript.Quit 64
Set shell = CreateObject("WScript.Shell")
Set filesystem = CreateObject("Scripting.FileSystemObject")
' Hidden launchers must never open a prompt, picker, or wait for input.
shell.Environment("Process")("HGR_UPDATE_NONINTERACTIVE") = "1"
scriptPath = WScript.Arguments(0)
If Not filesystem.FileExists(scriptPath) Then WScript.Quit 2
q = Chr(34)
command = q & shell.ExpandEnvironmentStrings("%ComSpec%") & q & " /d /c " & q & q & scriptPath & q & q
shell.Run command, 0, False
