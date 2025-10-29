using SiyeFlow.TestApi.Models;
using System.Collections.Concurrent;

namespace SiyeFlow.TestApi.Services
{
    public interface IDataService
    {
        // Users
        List<User> GetAllUsers();
        User? GetUser(int id);
        User CreateUser(User user);
        User? UpdateUser(int id, User user);
        bool DeleteUser(int id);

        // Posts
        List<Post> GetAllPosts(int? userId = null);
        Post? GetPost(int id);
        Post CreatePost(NewPost newPost);
        Post? UpdatePost(int id, Post post);
        bool DeletePost(int id);
    }

    public class DataService : IDataService
    {
        private readonly ConcurrentDictionary<int, User> _users = new();
        private readonly ConcurrentDictionary<int, Post> _posts = new();
        private int _nextUserId = 1;
        private int _nextPostId = 1;

        public DataService()
        {
            // Seed some initial data
            SeedData();
        }

        private void SeedData()
        {
            // Add sample users
            var users = new[]
            {
                new User
                {
                    Id = _nextUserId++,
                    Name = "John Doe",
                    Username = "johndoe",
                    Email = "john@example.com",
                    Address = new Address
                    {
                        Street = "123 Main St",
                        Suite = "Apt 4B",
                        City = "New York",
                        Zipcode = "10001"
                    },
                    Phone = "555-123-4567",
                    Website = "johndoe.com"
                },
                new User
                {
                    Id = _nextUserId++,
                    Name = "Jane Smith",
                    Username = "janesmith",
                    Email = "jane@example.com",
                    Address = new Address
                    {
                        Street = "456 Oak Ave",
                        Suite = "Suite 200",
                        City = "Los Angeles",
                        Zipcode = "90001"
                    },
                    Phone = "555-987-6543",
                    Website = "janesmith.io"
                }
            };

            foreach (var user in users)
            {
                _users[user.Id] = user;
            }

            // Add sample posts
            var posts = new[]
            {
                new Post
                {
                    Id = _nextPostId++,
                    UserId = 1,
                    Title = "My First Post",
                    Body = "This is the body of my first post. It's a great day to start blogging!"
                },
                new Post
                {
                    Id = _nextPostId++,
                    UserId = 1,
                    Title = "Learning ASP.NET Core",
                    Body = "ASP.NET Core is a fantastic framework for building modern web applications."
                },
                new Post
                {
                    Id = _nextPostId++,
                    UserId = 2,
                    Title = "Hello World",
                    Body = "Hello everyone! This is Jane's first post on this platform."
                }
            };

            foreach (var post in posts)
            {
                _posts[post.Id] = post;
            }
        }

        // User methods
        public List<User> GetAllUsers()
        {
            return _users.Values.OrderBy(u => u.Id).ToList();
        }

        public User? GetUser(int id)
        {
            return _users.GetValueOrDefault(id);
        }

        public User CreateUser(User user)
        {
            user.Id = _nextUserId++;
            _users[user.Id] = user;
            return user;
        }

        public User? UpdateUser(int id, User user)
        {
            if (_users.ContainsKey(id))
            {
                user.Id = id;
                _users[id] = user;
                return user;
            }
            return null;
        }

        public bool DeleteUser(int id)
        {
            return _users.TryRemove(id, out _);
        }

        // Post methods
        public List<Post> GetAllPosts(int? userId = null)
        {
            var posts = _posts.Values.AsEnumerable();
            if (userId.HasValue)
            {
                posts = posts.Where(p => p.UserId == userId.Value);
            }
            return posts.OrderBy(p => p.Id).ToList();
        }

        public Post? GetPost(int id)
        {
            return _posts.GetValueOrDefault(id);
        }

        public Post CreatePost(NewPost newPost)
        {
            var post = new Post
            {
                Id = _nextPostId++,
                UserId = newPost.UserId,
                Title = newPost.Title,
                Body = newPost.Body
            };
            _posts[post.Id] = post;
            return post;
        }

        public Post? UpdatePost(int id, Post post)
        {
            if (_posts.ContainsKey(id))
            {
                post.Id = id;
                _posts[id] = post;
                return post;
            }
            return null;
        }

        public bool DeletePost(int id)
        {
            return _posts.TryRemove(id, out _);
        }
    }
}
