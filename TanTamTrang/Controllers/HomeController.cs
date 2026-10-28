using Microsoft.AspNetCore.Mvc;
using System.IO;

namespace TanTamTrang.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return PhysicalFile(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html"), "text/html");
        }

        [Route("about")]
        [Route("about.html")]
        public IActionResult About()
        {
            return PhysicalFile(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "about.html"), "text/html");
        }

        [Route("contact")]
        [Route("contact.html")]
        public IActionResult Contact()
        {
            return PhysicalFile(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "contact.html"), "text/html");
        }
        
        [Route("works")]
        [Route("works.html")]
        public IActionResult Works()
        {
            return PhysicalFile(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "works.html"), "text/html");
        }
    }
}
