using Microsoft.AspNetCore.Mvc;
using SiyeFlow.TestApi.Models;
using SiyeFlow.TestApi.Services;

namespace SiyeFlow.TestApi.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId}/[controller]")]
    public class JobsController : ControllerBase
    {
        private readonly IDataService _dataService;
        private readonly ILogger<JobsController> _logger;

        public JobsController(IDataService dataService, ILogger<JobsController> logger)
        {
            _dataService = dataService;
            _logger = logger;
        }

        /// <summary>
        /// List all jobs for a project
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<Job>), 200)]
        public IActionResult ListJobs(Guid projectId)
        {
            _logger.LogInformation($"Retrieving all jobs for project {projectId}");
            var jobs = _dataService.GetProjectJobs(projectId);
            return Ok(jobs);
        }

        /// <summary>
        /// Get a specific job
        /// </summary>
        [HttpGet("{jobId}")]
        [ProducesResponseType(typeof(Job), 200)]
        [ProducesResponseType(404)]
        public IActionResult GetJob(Guid projectId, Guid jobId)
        {
            _logger.LogInformation($"Retrieving job {jobId} from project {projectId}");
            var job = _dataService.GetJobById(projectId, jobId);
            
            if (job == null)
            {
                _logger.LogWarning($"Job {jobId} not found in project {projectId}");
                return NotFound(new { error = "Job not found" });
            }
            
            return Ok(job);
        }

        /// <summary>
        /// Create a new job for a project
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(Job), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public IActionResult CreateJob(Guid projectId, [FromBody] CreateJobRequest request)
        {
            // Verify project exists
            var project = _dataService.GetProjectById(projectId);
            if (project == null)
            {
                return NotFound(new { error = "Project not found" });
            }
            
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { error = "Job name is required" });
            }
            
            _logger.LogInformation($"Creating new job for project {projectId}: {request.Name}");
            var job = _dataService.CreateJob(projectId, request);
            
            return CreatedAtAction(
                nameof(GetJob), 
                new { projectId = projectId, jobId = job.Id }, 
                job
            );
        }

        /// <summary>
        /// Update an existing job
        /// </summary>
        [HttpPut("{jobId}")]
        [ProducesResponseType(typeof(Job), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(400)]
        public IActionResult UpdateJob(Guid projectId, Guid jobId, [FromBody] UpdateJobRequest request)
        {
            _logger.LogInformation($"Updating job {jobId} in project {projectId}");
            var job = _dataService.UpdateJob(projectId, jobId, request);
            
            if (job == null)
            {
                _logger.LogWarning($"Job {jobId} not found in project {projectId} for update");
                return NotFound(new { error = "Job not found" });
            }
            
            return Ok(job);
        }

        /// <summary>
        /// Delete a job
        /// </summary>
        [HttpDelete("{jobId}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public IActionResult DeleteJob(Guid projectId, Guid jobId)
        {
            _logger.LogInformation($"Deleting job {jobId} from project {projectId}");
            var deleted = _dataService.DeleteJob(projectId, jobId);
            
            if (!deleted)
            {
                _logger.LogWarning($"Job {jobId} not found in project {projectId} for deletion");
                return NotFound(new { error = "Job not found" });
            }
            
            return NoContent();
        }
    }
}

