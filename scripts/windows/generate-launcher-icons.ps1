Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class HgrLauncherIconFactory
{
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern bool DestroyIcon(IntPtr handle);

    private static void RgbToHsv(Color color, out double h, out double s, out double v)
    {
        double r = color.R / 255.0;
        double g = color.G / 255.0;
        double b = color.B / 255.0;
        double max = Math.Max(r, Math.Max(g, b));
        double min = Math.Min(r, Math.Min(g, b));
        double delta = max - min;

        h = 0.0;
        if (delta > 0.000001)
        {
            if (max == r) h = 60.0 * (((g - b) / delta) % 6.0);
            else if (max == g) h = 60.0 * (((b - r) / delta) + 2.0);
            else h = 60.0 * (((r - g) / delta) + 4.0);
        }
        if (h < 0.0) h += 360.0;

        s = max <= 0.000001 ? 0.0 : delta / max;
        v = max;
    }

    private static Color HsvToColor(double h, double s, double v, int alpha)
    {
        h = ((h % 360.0) + 360.0) % 360.0;
        s = Math.Max(0.0, Math.Min(1.0, s));
        v = Math.Max(0.0, Math.Min(1.0, v));

        double c = v * s;
        double x = c * (1.0 - Math.Abs(((h / 60.0) % 2.0) - 1.0));
        double m = v - c;

        double r1 = 0, g1 = 0, b1 = 0;
        if (h < 60) { r1 = c; g1 = x; }
        else if (h < 120) { r1 = x; g1 = c; }
        else if (h < 180) { g1 = c; b1 = x; }
        else if (h < 240) { g1 = x; b1 = c; }
        else if (h < 300) { r1 = x; b1 = c; }
        else { r1 = c; b1 = x; }

        return Color.FromArgb(
            alpha,
            (int)Math.Round((r1 + m) * 255.0),
            (int)Math.Round((g1 + m) * 255.0),
            (int)Math.Round((b1 + m) * 255.0)
        );
    }

    private static GraphicsPath RoundedRectangle(RectangleF rect, float radius)
    {
        float diameter = radius * 2.0f;
        GraphicsPath path = new GraphicsPath();
        path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
        path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
        path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
    }

    private static void DrawTerminalBadge(Bitmap bitmap)
    {
        using (Graphics graphics = Graphics.FromImage(bitmap))
        {
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            RectangleF badgeRect = new RectangleF(165, 171, 72, 52);

            using (GraphicsPath path = RoundedRectangle(badgeRect, 12))
            using (SolidBrush fill = new SolidBrush(Color.FromArgb(242, 23, 32, 51)))
            using (Pen outline = new Pen(Color.FromArgb(210, 238, 244, 250), 2))
            {
                graphics.FillPath(fill, path);
                graphics.DrawPath(outline, path);
            }

            using (Font font = new Font("Consolas", 25, FontStyle.Bold, GraphicsUnit.Pixel))
            using (SolidBrush brush = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                graphics.DrawString(">_", font, brush, 171, 181);
            }
        }
    }

    private static void SaveBitmapAsIcon(Bitmap bitmap, string outputPath)
    {
        IntPtr handle = bitmap.GetHicon();
        try
        {
            using (Icon icon = Icon.FromHandle(handle))
            using (FileStream stream = File.Create(outputPath))
            {
                icon.Save(stream);
            }
        }
        finally
        {
            DestroyIcon(handle);
        }
    }

    public static void Create(
        string sourcePath,
        string outputPath,
        double targetHue,
        double saturationScale,
        double valueScale,
        bool terminalBadge)
    {
        using (Bitmap source = new Bitmap(sourcePath))
        using (Bitmap bitmap = new Bitmap(256, 256, PixelFormat.Format32bppArgb))
        {
            using (Graphics graphics = Graphics.FromImage(bitmap))
            {
                graphics.Clear(Color.Transparent);
                graphics.SmoothingMode = SmoothingMode.HighQuality;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                graphics.DrawImage(source, new Rectangle(0, 0, 256, 256));
            }

            // The tracked Halieus app icon is already the approved shape, H
            // geometry, rim, gloss and depth. Only warm/gold body pixels are
            // recoloured; navy identity pixels and highlights remain intact.
            for (int y = 0; y < bitmap.Height; y++)
            {
                for (int x = 0; x < bitmap.Width; x++)
                {
                    Color pixel = bitmap.GetPixel(x, y);
                    if (pixel.A == 0) continue;

                    double hue, saturation, value;
                    RgbToHsv(pixel, out hue, out saturation, out value);

                    if (hue >= 18.0 && hue <= 60.0 && saturation >= 0.15 && value >= 0.10)
                    {
                        Color recoloured = HsvToColor(
                            targetHue,
                            saturation * saturationScale,
                            value * valueScale,
                            pixel.A
                        );
                        bitmap.SetPixel(x, y, recoloured);
                    }
                }
            }

            if (terminalBadge) DrawTerminalBadge(bitmap);
            SaveBitmapAsIcon(bitmap, outputPath);
        }
    }
}
"@

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$LauncherRoot = Join-Path $ProjectRoot 'assets\branding\launchers'
$SourceIcon = Join-Path $ProjectRoot 'assets\branding\Halieus Game Room.png'
$BrandingRevision = 'r5'

if (-not (Test-Path -LiteralPath $SourceIcon)) {
    throw "Canonical Halieus branding source is missing: $SourceIcon"
}

New-Item -ItemType Directory -Force -Path $LauncherRoot | Out-Null
Get-ChildItem -LiteralPath $LauncherRoot -Filter '*.ico' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

# r5 does not redraw the Halieus mark. It colour-grades the approved primary
# icon so every utility remains unmistakably part of the same product family.
[HgrLauncherIconFactory]::Create(
    $SourceIcon,
    (Join-Path $LauncherRoot "Start Halieus Game Room-$BrandingRevision.ico"),
    145.0,
    0.95,
    0.98,
    $false
)

[HgrLauncherIconFactory]::Create(
    $SourceIcon,
    (Join-Path $LauncherRoot "Restart Halieus Game Room-$BrandingRevision.ico"),
    36.0,
    0.90,
    0.97,
    $false
)

[HgrLauncherIconFactory]::Create(
    $SourceIcon,
    (Join-Path $LauncherRoot "Close Halieus Game Room-$BrandingRevision.ico"),
    356.0,
    0.90,
    0.95,
    $false
)

[HgrLauncherIconFactory]::Create(
    $SourceIcon,
    (Join-Path $LauncherRoot "Update Halieus Website-$BrandingRevision.ico"),
    213.0,
    0.95,
    0.98,
    $false
)

[HgrLauncherIconFactory]::Create(
    $SourceIcon,
    (Join-Path $LauncherRoot "HGR PowerShell-$BrandingRevision.ico"),
    205.0,
    0.58,
    0.84,
    $true
)

Write-Host 'HGR launcher icons generated from the canonical Halieus mark.'
