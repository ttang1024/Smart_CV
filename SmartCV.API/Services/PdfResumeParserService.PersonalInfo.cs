using SmartCV.API.Models;

namespace SmartCV.API.Services;

public partial class PdfResumeParserService
{
    // ── Personal info ─────────────────────────────────────────────────────────

    private static PersonalInfoModel ParsePersonalInfo(List<string> lines)
    {
        var info = new PersonalInfoModel();
        var remaining = new List<string>();

        foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l)))
        {
            // Email
            var emailMatch = EmailRx().Match(line);
            if (emailMatch.Success && string.IsNullOrEmpty(info.Email))
            {
                info.Email = emailMatch.Value;
                continue;
            }

            // LinkedIn (before generic URL check)
            var liMatch = LinkedInRx().Match(line);
            if (liMatch.Success && info.LinkedIn is null)
            {
                info.LinkedIn = UrlRx().Match(line) is { Success: true } urlM ? urlM.Value : line.Trim();
                continue;
            }

            // GitHub
            var ghMatch = GitHubRx().Match(line);
            if (ghMatch.Success && info.GitHub is null)
            {
                info.GitHub = UrlRx().Match(line) is { Success: true } urlM2 ? urlM2.Value : line.Trim();
                continue;
            }

            // Generic URL → website
            // Keep !liMatch.Success so a duplicate LinkedIn URL isn't captured as website.
            // Allow GitHub-matching URLs through: if the GitHub profile was already set and this
            // is a different URL (e.g. a repo link), it should be captured as the website.
            var urlMatch = UrlRx().Match(line);
            if (urlMatch.Success && info.Website is null && !liMatch.Success)
            {
                info.Website = urlMatch.Value;
                continue;
            }

            // Phone (only digits/spaces/dashes/parens, length 7-15)
            var phoneMatch = PhoneRx().Match(line);
            if (phoneMatch.Success && string.IsNullOrEmpty(info.Phone)
                && phoneMatch.Value.Count(char.IsDigit) >= 7)
            {
                info.Phone = phoneMatch.Value.Trim();
                continue;
            }

            remaining.Add(line);
        }

        // From the non-contact lines, first non-empty = name, second = title or location
        var candidates = remaining.Where(l => !string.IsNullOrWhiteSpace(l)).ToList();

        if (candidates.Count > 0)
            info.FullName = candidates[0].Trim();

        if (candidates.Count > 1)
        {
            var second = candidates[1].Trim();
            // Looks like a location if it has a comma (including Chinese full-width ，) and is short
            if ((second.Contains(',') || second.Contains('，')) && second.Length < 50 && !second.Any(char.IsDigit))
                info.Location = second;
            else
                info.Title = second;
        }

        if (candidates.Count > 2)
        {
            var third = candidates[2].Trim();
            if (string.IsNullOrEmpty(info.Location) && (third.Contains(',') || third.Contains('，')) && third.Length < 50)
                info.Location = third;
            else if (string.IsNullOrEmpty(info.Title))
                info.Title = third;
        }

        return info;
    }
}
