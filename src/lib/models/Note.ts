import { Tags } from "./Tags.ts";
import { User } from "./User.ts";
import { objectModes, sqlRelation } from "../backend_types.ts";

export interface Note<K extends objectModes> {
    id: string;
    Title: string;
    Body: string;
    Pinned: boolean;
    Tags?: sqlRelation<Tags<K>, K>[];
    user: sqlRelation<User<K>, K>;
    created: string;
    updated: string;
}
