using SiyeFlow.TestApi.Models;
using System.Collections.Concurrent;

namespace SiyeFlow.TestApi.Services
{
    public interface IDataService
    {
        // Project operations
        List<Project> GetAllProjects();
        Project? GetProjectById(Guid id);
        Project CreateProject(CreateProjectRequest request);
        Project? UpdateProject(Guid id, UpdateProjectRequest request);
        bool DeleteProject(Guid id);

        // Job operations
        List<Job> GetProjectJobs(Guid projectId);
        Job? GetJobById(Guid projectId, Guid jobId);
        Job CreateJob(Guid projectId, CreateJobRequest request);
        Job? UpdateJob(Guid projectId, Guid jobId, UpdateJobRequest request);
        bool DeleteJob(Guid projectId, Guid jobId);
    }

    public class DataService : IDataService
    {
        private readonly ConcurrentDictionary<Guid, Project> _projects = new();
        private readonly ConcurrentDictionary<Guid, Job> _jobs = new();

        public DataService()
        {
            // Seed some initial data
            SeedData();
        }

        private void SeedData()
        {
            // Create sample projects
            var project1 = CreateProject(new CreateProjectRequest 
            { 
                Name = "E-Commerce Platform", 
                Description = "Building a modern e-commerce platform with microservices" 
            });
            
            var project2 = CreateProject(new CreateProjectRequest 
            { 
                Name = "Data Analytics Dashboard", 
                Description = "Real-time analytics dashboard for business intelligence" 
            });
            
            var project3 = CreateProject(new CreateProjectRequest 
            { 
                Name = "Mobile App Backend", 
                Description = "RESTful API backend for mobile application" 
            });
            
            // Add jobs to project 1
            CreateJob(project1.Id, new CreateJobRequest 
            { 
                Name = "Database Migration",
                Status = "completed",
                Content = new JobContent 
                { 
                    Line1 = "Migrated 50,000 products to new schema", 
                    Line2 = "Completed in 2 hours with zero downtime" 
                }
            });
            
            CreateJob(project1.Id, new CreateJobRequest 
            { 
                Name = "Payment Integration",
                Status = "running",
                Content = new JobContent 
                { 
                    Line1 = "Integrating Stripe payment gateway", 
                    Line2 = "Testing webhook endpoints" 
                }
            });
            
            CreateJob(project1.Id, new CreateJobRequest 
            { 
                Name = "Security Audit",
                Status = "pending",
                Content = new JobContent 
                { 
                    Line1 = "Scheduled security penetration testing", 
                    Line2 = "Waiting for security team availability" 
                }
            });
            
            // Add jobs to project 2
            CreateJob(project2.Id, new CreateJobRequest 
            { 
                Name = "Data Pipeline Setup",
                Status = "completed",
                Content = new JobContent 
                { 
                    Line1 = "ETL pipeline configured for real-time data", 
                    Line2 = "Processing 1M records per hour" 
                }
            });
            
            CreateJob(project2.Id, new CreateJobRequest 
            { 
                Name = "Dashboard UI Development",
                Status = "running",
                Content = new JobContent 
                { 
                    Line1 = "Building interactive charts with D3.js", 
                    Line2 = "60% of components completed" 
                }
            });
            
            // Add jobs to project 3
            CreateJob(project3.Id, new CreateJobRequest 
            { 
                Name = "API Documentation",
                Status = "completed",
                Content = new JobContent 
                { 
                    Line1 = "OpenAPI specification completed", 
                    Line2 = "Published to developer portal" 
                }
            });
            
            CreateJob(project3.Id, new CreateJobRequest 
            { 
                Name = "Load Testing",
                Status = "failed",
                Content = new JobContent 
                { 
                    Line1 = "Performance test failed at 10K concurrent users", 
                    Line2 = "Investigating bottlenecks in database connections" 
                }
            });
        }

        // Project methods
        public List<Project> GetAllProjects()
        {
            return _projects.Values
                .OrderByDescending(p => p.UpdatedAt)
                .ToList();
        }

        public Project? GetProjectById(Guid id)
        {
            if (_projects.TryGetValue(id, out var project))
            {
                // Include jobs in the project
                project.Jobs = _jobs.Values
                    .Where(j => j.ProjectId == id)
                    .OrderByDescending(j => j.CreatedAt)
                    .ToList();
                return project;
            }
            return null;
        }

        public Project CreateProject(CreateProjectRequest request)
        {
            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Jobs = new List<Job>()
            };
            
            _projects[project.Id] = project;
            return project;
        }

        public Project? UpdateProject(Guid id, UpdateProjectRequest request)
        {
            if (_projects.TryGetValue(id, out var project))
            {
                if (!string.IsNullOrEmpty(request.Name))
                    project.Name = request.Name;
                    
                if (!string.IsNullOrEmpty(request.Description))
                    project.Description = request.Description;
                    
                project.UpdatedAt = DateTime.UtcNow;
                
                _projects[id] = project;
                return project;
            }
            return null;
        }

        public bool DeleteProject(Guid id)
        {
            if (_projects.TryRemove(id, out _))
            {
                // Also delete all associated jobs
                var jobsToDelete = _jobs.Values
                    .Where(j => j.ProjectId == id)
                    .Select(j => j.Id)
                    .ToList();
                    
                foreach (var jobId in jobsToDelete)
                {
                    _jobs.TryRemove(jobId, out _);
                }
                
                return true;
            }
            return false;
        }

        // Job methods
        public List<Job> GetProjectJobs(Guid projectId)
        {
            return _jobs.Values
                .Where(j => j.ProjectId == projectId)
                .OrderByDescending(j => j.CreatedAt)
                .ToList();
        }

        public Job? GetJobById(Guid projectId, Guid jobId)
        {
            if (_jobs.TryGetValue(jobId, out var job) && job.ProjectId == projectId)
            {
                return job;
            }
            return null;
        }

        public Job CreateJob(Guid projectId, CreateJobRequest request)
        {
            var job = new Job
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                Name = request.Name,
                Status = request.Status ?? "pending",
                Content = request.Content ?? new JobContent(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            _jobs[job.Id] = job;
            
            // Update project's updated time
            if (_projects.TryGetValue(projectId, out var project))
            {
                project.UpdatedAt = DateTime.UtcNow;
            }
            
            return job;
        }

        public Job? UpdateJob(Guid projectId, Guid jobId, UpdateJobRequest request)
        {
            if (_jobs.TryGetValue(jobId, out var job) && job.ProjectId == projectId)
            {
                if (!string.IsNullOrEmpty(request.Name))
                    job.Name = request.Name;
                    
                if (!string.IsNullOrEmpty(request.Status))
                    job.Status = request.Status;
                    
                if (request.Content != null)
                    job.Content = request.Content;
                    
                job.UpdatedAt = DateTime.UtcNow;
                
                _jobs[jobId] = job;
                
                // Update project's updated time
                if (_projects.TryGetValue(projectId, out var project))
                {
                    project.UpdatedAt = DateTime.UtcNow;
                }
                
                return job;
            }
            return null;
        }

        public bool DeleteJob(Guid projectId, Guid jobId)
        {
            if (_jobs.TryGetValue(jobId, out var job) && job.ProjectId == projectId)
            {
                if (_jobs.TryRemove(jobId, out _))
                {
                    // Update project's updated time
                    if (_projects.TryGetValue(projectId, out var project))
                    {
                        project.UpdatedAt = DateTime.UtcNow;
                    }
                    return true;
                }
            }
            return false;
        }
    }
}