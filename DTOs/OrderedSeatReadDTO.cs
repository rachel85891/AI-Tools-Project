using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace DTOs
{
    public record OrderedSeatReadDTO(
        int Id, 
        int Row, 
        int Col, 
        int Status,  
        int orderId,
        int OrderUserId,
        int SectionId,
        int SectionSectionType,
        int ShowId,
        string ShowTitle, 
        string ShowImgUrl, 
        string ShowDate, 
        string ShowBeginTime
        );
}
