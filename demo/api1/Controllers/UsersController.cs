using Microsoft.AspNetCore.Mvc;
using SiyeFlow.TestApi.Models;
using SiyeFlow.TestApi.Services;

namespace SiyeFlow.TestApi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IDataService _dataService;
        private readonly ILogger<UsersController> _logger;

        public UsersController(IDataService dataService, ILogger<UsersController> logger)
        {
            _dataService = dataService;
            _logger = logger;
        }

        /// <summary>
        /// Get all users
        /// </summary>
        [HttpGet(Name = "GetUsers")]
        public ActionResult<List<User>> GetUsers()
        {
            _logger.LogInformation("Getting all users");
            var users = _dataService.GetAllUsers();
            return Ok(users);
        }

        /// <summary>
        /// Get user by ID
        /// </summary>
        [HttpGet("{userId}", Name = "GetUser")]
        public ActionResult<User> GetUser(int userId)
        {
            _logger.LogInformation("Getting user {UserId}", userId);
            var user = _dataService.GetUser(userId);
            
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found", userId);
                return NotFound();
            }

            return Ok(user);
        }

        /// <summary>
        /// Create a new user
        /// </summary>
        [HttpPost(Name = "CreateUser")]
        public ActionResult<User> CreateUser([FromBody] User user)
        {
            _logger.LogInformation("Creating new user");
            var createdUser = _dataService.CreateUser(user);
            return CreatedAtRoute("GetUser", new { userId = createdUser.Id }, createdUser);
        }

        /// <summary>
        /// Update a user
        /// </summary>
        [HttpPut("{userId}", Name = "UpdateUser")]
        public ActionResult<User> UpdateUser(int userId, [FromBody] User user)
        {
            _logger.LogInformation("Updating user {UserId}", userId);
            var updatedUser = _dataService.UpdateUser(userId, user);
            
            if (updatedUser == null)
            {
                _logger.LogWarning("User {UserId} not found for update", userId);
                return NotFound();
            }

            return Ok(updatedUser);
        }

        /// <summary>
        /// Delete a user
        /// </summary>
        [HttpDelete("{userId}", Name = "DeleteUser")]
        public ActionResult DeleteUser(int userId)
        {
            _logger.LogInformation("Deleting user {UserId}", userId);
            var result = _dataService.DeleteUser(userId);
            
            if (!result)
            {
                _logger.LogWarning("User {UserId} not found for deletion", userId);
                return NotFound();
            }

            return NoContent();
        }
    }
}
