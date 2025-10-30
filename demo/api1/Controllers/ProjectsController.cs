using Microsoft.AspNetCore.Mvc;
using SiyeFlow.TestApi.Models;
using SiyeFlow.TestApi.Services;

namespace SiyeFlow.TestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly IDataService _dataService;
        private readonly ILogger<ProjectsController> _logger;

        public ProjectsController(IDataService dataService, ILogger<ProjectsController> logger)
        {
            _dataService = dataService;
            _logger = logger;
        }

        /// <summary>
        /// List all projects
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<Project>), 200)]
        public IActionResult ListProjects()
        {
            _logger.LogInformation("Retrieving all projects");
            var projects = _dataService.GetAllProjects();
            return Ok(projects);
        }

        /// <summary>
        /// Get a specific project by ID
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Project), 200)]
        [ProducesResponseType(404)]
        public IActionResult GetProject(Guid id)
        {
            _logger.LogInformation($"Retrieving project {id}");
            var project = _dataService.GetProjectById(id);
            
            if (project == null)
            {
                _logger.LogWarning($"Project {id} not found");
                return NotFound(new { error = "Project not found" });
            }
            
            return Ok(project);
        }

        /// <summary>
        /// Create a new project
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(Project), 201)]
        [ProducesResponseType(400)]
        public IActionResult CreateProject([FromBody] CreateProjectRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { error = "Project name is required" });
            }
            
            _logger.LogInformation($"Creating new project: {request.Name}");
            var project = _dataService.CreateProject(request);
            
            return CreatedAtAction(
                nameof(GetProject), 
                new { id = project.Id }, 
                project
            );
        }

        /// <summary>
        /// Update an existing project
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(Project), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(400)]
        public IActionResult UpdateProject(Guid id, [FromBody] UpdateProjectRequest request)
        {
            _logger.LogInformation($"Updating project {id}");
            var project = _dataService.UpdateProject(id, request);
            
            if (project == null)
            {
                _logger.LogWarning($"Project {id} not found for update");
                return NotFound(new { error = "Project not found" });
            }
            
            return Ok(project);
        }

        /// <summary>
        /// Delete a project
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public IActionResult DeleteProject(Guid id)
        {
            _logger.LogInformation($"Deleting project {id}");
            var deleted = _dataService.DeleteProject(id);
            
            if (!deleted)
            {
                _logger.LogWarning($"Project {id} not found for deletion");
                return NotFound(new { error = "Project not found" });
            }
            
            return NoContent();
        }
    }
}

