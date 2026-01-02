export interface User {
    id: string;
    email: string;
    emailVisibility: boolean;
    verified?: boolean;
    name: string;
    avatar?: File;
    proUser: boolean;
    created: Date;
    updated: Date;
}