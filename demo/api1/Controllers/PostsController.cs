using Microsoft.AspNetCore.Mvc;
using SiyeFlow.TestApi.Models;
using SiyeFlow.TestApi.Services;

namespace SiyeFlow.TestApi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly IDataService _dataService;
        private readonly ILogger<PostsController> _logger;

        public PostsController(IDataService dataService, ILogger<PostsController> logger)
        {
            _dataService = dataService;
            _logger = logger;
        }

        /// <summary>
        /// Get all posts
        /// </summary>
        [HttpGet(Name = "GetPosts")]
        public ActionResult<List<Post>> GetPosts([FromQuery] int? userId)
        {
            _logger.LogInformation("Getting posts, userId filter: {UserId}", userId);
            var posts = _dataService.GetAllPosts(userId);
            return Ok(posts);
        }

        /// <summary>
        /// Get post by ID
        /// </summary>
        [HttpGet("{postId}", Name = "GetPost")]
        public ActionResult<Post> GetPost(int postId)
        {
            _logger.LogInformation("Getting post {PostId}", postId);
            var post = _dataService.GetPost(postId);
            
            if (post == null)
            {
                _logger.LogWarning("Post {PostId} not found", postId);
                return NotFound();
            }

            return Ok(post);
        }

        /// <summary>
        /// Create a new post
        /// </summary>
        [HttpPost(Name = "CreatePost")]
        public ActionResult<Post> CreatePost([FromBody] NewPost newPost)
        {
            _logger.LogInformation("Creating new post for user {UserId}", newPost.UserId);
            
            // Verify user exists
            var user = _dataService.GetUser(newPost.UserId);
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for post creation", newPost.UserId);
                return BadRequest($"User with ID {newPost.UserId} not found");
            }

            var createdPost = _dataService.CreatePost(newPost);
            return CreatedAtRoute("GetPost", new { postId = createdPost.Id }, createdPost);
        }

        /// <summary>
        /// Update a post
        /// </summary>
        [HttpPut("{postId}", Name = "UpdatePost")]
        public ActionResult<Post> UpdatePost(int postId, [FromBody] Post post)
        {
            _logger.LogInformation("Updating post {PostId}", postId);
            var updatedPost = _dataService.UpdatePost(postId, post);
            
            if (updatedPost == null)
            {
                _logger.LogWarning("Post {PostId} not found for update", postId);
                return NotFound();
            }

            return Ok(updatedPost);
        }

        /// <summary>
        /// Delete a post
        /// </summary>
        [HttpDelete("{postId}", Name = "DeletePost")]
        public ActionResult DeletePost(int postId)
        {
            _logger.LogInformation("Deleting post {PostId}", postId);
            var result = _dataService.DeletePost(postId);
            
            if (!result)
            {
                _logger.LogWarning("Post {PostId} not found for deletion", postId);
                return NotFound();
            }

            return Ok(new { message = "Post deleted successfully" });
        }
    }
}
