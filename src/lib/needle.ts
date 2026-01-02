export type moduleFunction<T, K> = ($container: iocContainer<T>) => K

enum moduleTypes {
    NORMAL = 0,
    SINGLETON = 1
}


export class iocContainer<T> {

    private singletonCache: {[key in keyof T]?: T[key]} = {}

    private registry: {[key in keyof T]?: {type: moduleTypes, fn: moduleFunction<T, T[key]>}} = {}

    public bind<K extends keyof T>(key: K, module: moduleFunction<T, T[K]>): void {
        this.registry[key] = {type: moduleTypes.NORMAL, fn: module}
    }

    public singleton<K extends keyof T>(key: K, module: moduleFunction<T, T[K]>): void {
        this.registry[key] = {type: moduleTypes.SINGLETON, fn: module}
    }

    public load(...classNames: any): void{
        for(let className of classNames) {
            className.bind(this)
        }
    }

    public $import<K extends keyof T>(key: K): T[K] {
        const module = this.registry[key]
        if(!module) {
            throw new Error(`Module ${String(key)} could not be resolved.`)
        } else if(module.type == moduleTypes.SINGLETON) {
            if (!(key in this.singletonCache)) {
                this.singletonCache[key] = module.fn(this)
            }

            return this.singletonCache[key]!
        } else {
            return module.fn(this);
        }
    }
}