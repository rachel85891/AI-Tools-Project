import { SeatMap } from "./map-model";


export enum TargetAudience {
    PRESCHOOL = '🧸 גיל הרך',
    CHILDREN = '🪁 ילדים',    
    YOUTH = '🎧 נוער',       
    ADULTS = '☕ מבוגרים',
    SENIORS = '🧶 גיל הזהב'
}

export enum Sector {
    MEN ='🍀 גברים',
    WOMEN = '🍁 נשים',    
    FAMILIES = '🍂 משפחות'
}

export enum Section {
    HALL = 'אולם',
    RIGHT_BALCONY = 'יציע ימין',    
    LEFT_BALCONY = 'יציע שמאל',
    CENTER_BALCONY = 'יציע מרכז'
}

export const SECTION_ID_MAP: { [key: number]: Section } = {
    1: Section.HALL,
    2: Section.RIGHT_BALCONY,
    3: Section.LEFT_BALCONY,
    4: Section.CENTER_BALCONY
};

/** Map Section enum to server section id (for POST body). */
export const SECTION_TO_ID: { [key in Section]: number } = {
    [Section.HALL]: 1,
    [Section.RIGHT_BALCONY]: 2,
    [Section.LEFT_BALCONY]: 3,
    [Section.CENTER_BALCONY]: 4
};

export class Show {
    id: number =0;
    title: string = '';
    date: Date = new Date();
    beginTime: Date | string = new Date();
    endTime: Date | string = new Date();
    audience: TargetAudience  = TargetAudience.ADULTS;
    sector: Sector = Sector.WOMEN;
    description: string ='';
    imgUrl: string | null = null;
    providerId: number =0;
    providerName:string='';
    providerProfileImgUrl:string=''
    categoryId: number= 301;
    categoryName: string='';
    hallMap:SeatMap = new SeatMap(0, Section.HALL);
    leftBalMap:SeatMap =new SeatMap(0, Section.LEFT_BALCONY);
    rightBalMap:SeatMap =new SeatMap(0, Section.RIGHT_BALCONY);
    centerBalMap:SeatMap =new SeatMap(0, Section.CENTER_BALCONY);
    /** Section IDs returned by the API for this show (1=HALL, 2=RIGHT_BALCONY, 3=LEFT_BALCONY, 4=CENTER_BALCONY). Only these sections are bookable. */
    sectionIdsFromApi: number[] = [];
    /** Maps section type (1–4) to the section's DB row id for this show. Used when sending lock request. */
    sectionDbIdByType: { [sectionType: number]: number } = {};
    minPrice: number = 0;
    popularity?: number;
    /** Ordered (reserved or sold) seats for this show from GET show by id. Used to mark seats unavailable on map. */
    orderedSeats: OrderedSeatDto[] = [];

    constructor(init?: Partial<Show>) {
        Object.assign(this, init);
    }

    /** Cheapest seat price from all sections (use when minPrice not set from API). */
    get cheapestPrice(): number {
        const prices = [
            this.hallMap?.price,
            this.leftBalMap?.price,
            this.rightBalMap?.price,
            this.centerBalMap?.price,
        ].filter((p): p is number => typeof p === 'number' && p > 0);
        if (prices.length === 0) return this.minPrice ?? 0;
        return Math.min(...prices);
    }

    /** DB section id for this show for the given section type (for lock API). */
    getSectionDbId(sectionType: number): number | undefined {
        return this.sectionDbIdByType[sectionType];
    }

    /** True if the show's date (and end time) has already passed. */
    get isPast(): boolean {
        const d = new Date(this.date);
        const et = this.endTime;
      
        if (typeof et === 'string' && et.includes(':')) {
          const [hours, minutes] = et.split(':').map(val => parseInt(val, 10));
          d.setHours(hours || 0, minutes || 0, 0, 0);
        } else if (et instanceof Date) {
          d.setHours(et.getHours(), et.getMinutes(), 0, 0);
        } else {
          d.setHours(23, 59, 59, 999);
        }
      
        return d.getTime() < Date.now();
      }

    /** Total number of seats across sections offered in this show. */
    get totalSeats(): number {
        let n = 0;
        const ids = this.sectionIdsFromApi ?? [];
        if (ids.includes(1)) n += (this.hallMap?.map?.flat().length ?? 0);
        if (ids.includes(2)) n += (this.rightBalMap?.map?.flat().length ?? 0);
        if (ids.includes(3)) n += (this.leftBalMap?.map?.flat().length ?? 0);
        if (ids.includes(4)) n += (this.centerBalMap?.map?.flat().length ?? 0);
        return n;
    }

    /** True if all seats are taken (ordered/sold). */
    get isFull(): boolean {
        const total = this.totalSeats;
        const taken = (this.orderedSeats ?? []).filter((seat) => {
            const status = Number((seat as OrderedSeatDto)?.status);
            return status === 1 || status === 2;
        }).length;
        return total > 0 && taken >= total;
    }
}

/** One ordered seat from API (sectionId 1–4, row/col indices). */
export interface OrderedSeatDto {
    sectionId: number;
    row: number;
    col: number;
    orderUserId: number;
    sectionSectionType:number;
    status:number;
}


