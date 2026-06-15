export class User {
    id: number =0;
    firstName: string ='';
    lastName: string ='';
    emailAddress: string ='';
    password: string ='';
    phoneNumber: string ='';
    /** Order items returned by GET user by id (e.g. reserved/sold seats). status 1 = in cart (reserved). */
    orders?: UserOrderItem[];
}

/** Single order/order-item from user. status: 1 = reserved (in cart), 2 = sold. */
export interface UserOrderItem {
    id: number;
    showId: number;
    sectionId: number;
    row: number;
    col: number;
    status: number;
    price?: number;
    userId?: number;
}