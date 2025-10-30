namespace SiyeFlow.TestApi.Models;

public class Job
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "pending"; // pending, running, completed, failed
    public JobContent Content { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class JobContent
{
    public string Line1 { get; set; } = "Sample line 1 for demo";
    public string Line2 { get; set; } = "Sample line 2 for demo";
    public Dictionary<string, object> AdditionalData { get; set; } = new();
}

public class CreateJobRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Status { get; set; }
    public JobContent? Content { get; set; }
}

public class UpdateJobRequest
{
    public string? Name { get; set; }
    public string? Status { get; set; }
    public JobContent? Content { get; set; }
}

