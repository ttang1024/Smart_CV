using System.Text;

namespace SmartCV.API.Tests.TestUtilities;

/// <summary>
/// Hand-builds the smallest PDF that PdfPig (and any spec-conformant reader) can open: one
/// page, one Helvetica text stream, and a byte-exact xref table computed from the actual
/// stream positions as we write — so /api/pdf/parse can be exercised with a real PDF binary
/// instead of a canned fixture file.
/// </summary>
public static class MinimalPdfFixture
{
    public static byte[] Create(params string[] lines)
    {
        var content = new StringBuilder();
        content.Append("BT /F1 12 Tf 72 700 Td\n");
        for (var i = 0; i < lines.Length; i++)
        {
            if (i > 0) content.Append("0 -18 Td\n");
            var escaped = lines[i].Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
            content.Append($"({escaped}) Tj\n");
        }
        content.Append("ET");
        var contentBytes = Encoding.ASCII.GetBytes(content.ToString());

        using var ms = new MemoryStream();
        void Write(string s) => ms.Write(Encoding.ASCII.GetBytes(s));

        var offsets = new List<long>();

        Write("%PDF-1.4\n");

        offsets.Add(ms.Position);
        Write("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        offsets.Add(ms.Position);
        Write("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

        offsets.Add(ms.Position);
        Write("3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n");

        offsets.Add(ms.Position);
        Write("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

        offsets.Add(ms.Position);
        Write($"5 0 obj\n<< /Length {contentBytes.Length} >>\nstream\n");
        ms.Write(contentBytes);
        Write("\nendstream\nendobj\n");

        var xrefOffset = ms.Position;
        Write($"xref\n0 {offsets.Count + 1}\n0000000000 65535 f \n");
        foreach (var offset in offsets)
            Write($"{offset:D10} 00000 n \n");

        Write($"trailer\n<< /Size {offsets.Count + 1} /Root 1 0 R >>\nstartxref\n{xrefOffset}\n%%EOF");

        return ms.ToArray();
    }
}
