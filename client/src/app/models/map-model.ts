import { Section } from "./show-model";
import { Seat } from "./seat-model";

export class SeatMap{
    section: Section = Section.HALL;
    price: number = null as unknown as number;
    map:Seat[][] =[];
    constructor(p:number, section:Section){
        this.section = section; // חובה תמיד להגדיר את הסוג קודם כל!
        
        if(p===0){
            this.price = null as unknown as number;
        } else {
            this.price = p;
        }
        
        let r=0;
        let c=0;
        switch (this.section) {
            case Section.HALL:
                r=10;
                c=20;
                break;
            case Section.CENTER_BALCONY:
                r=5;
                c=20;
                break;
            case Section.LEFT_BALCONY:
            case Section.RIGHT_BALCONY:
                r=15;
                c=5;
        }
        
        for (let i = 0; i < r; i++) {
            this.map[i] = []; 
            for (let j = 0; j < c; j++) {
                this.map[i][j] = new Seat();
                this.map[i][j].row = i;
                this.map[i][j].col = j;
                this.map[i][j].section = this.section;
            }
        } 
   }

   /** Number of seats in this section (for API payload). */
   get totalSeats(): number {
       return this.map.flat().length;
   }
}