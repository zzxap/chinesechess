[Setup]
AppId=com.zzxap.chinesechess
AppName=ChineseChess
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\ChineseChess
DefaultGroupName=ChineseChess
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=chinesechess-{#AppVersion}-windows-x64-setup-unsigned
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile={#SourceDir}\ChineseChess.ico
UninstallDisplayIcon={app}\ChineseChess.exe

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\ChineseChess"; Filename: "{app}\ChineseChess.exe"
Name: "{autodesktop}\ChineseChess"; Filename: "{app}\ChineseChess.exe"; Tasks: desktopicon

[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; Flags: unchecked

[Run]
Filename: "{app}\ChineseChess.exe"; Description: "Launch ChineseChess"; Flags: nowait postinstall skipifsilent
