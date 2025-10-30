namespace SiyeFlow.TestApi.Models;

public class Project
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<Job> Jobs { get; set; } = new();
}

public class CreateProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class UpdateProjectRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
}

