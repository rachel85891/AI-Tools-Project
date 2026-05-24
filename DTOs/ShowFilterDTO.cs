using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTOs
{
    public class ShowFilterDTO
    {
        public string? description { get; set; }
        public int? minPrice { get; set; }
        public int? maxPrice { get; set; }
        public int skip { get; set; } = 10;
        public int position { get; set; } = 1;
        public int[] categoryIdS { get; set; } = Array.Empty<int>();
        public string[] sectors { get; set; } = Array.Empty<string>();
        public string[] audiences { get; set; } = Array.Empty<string>();
        public string? sortField { get; set; }
        public int sortOrder { get; set; } = 1;
    };
}
