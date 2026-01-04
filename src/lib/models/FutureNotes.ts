import {objectModes, sqlRelation} from "../backend_types.ts";
import {User} from "./User.ts";

export interface FutureNotes<K extends objectModes> {
    Content: string,
    DeliveryDate: string,
    Delivered: boolean,
    user: sqlRelation<User<K>, K>
}