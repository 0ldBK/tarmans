'use strict';

const fs = require('fs'),
    path = require('path'),
    config = require('./config'),
    route = require('koa-route'),
    htmlJsStr = require('js-string-escape'),
    uglify = require('uglify-js'),
    Model = require('mongorito').Model,
    ObjectId = require('mongorito').ObjectId;

function wrap() {
    'use strict';

    let args = [].slice.call(arguments),
        func = args.shift();
    return new Promise(function (resolve, reject) {
        args.push(function (error, result) {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
        func.apply(this, args);
    });
}

function* getCurrentHash() {
    let ref = yield wrap(fs.readFile, path.resolve(config.pluginModules, '.git/HEAD'), 'utf8');
    let hash = yield wrap(fs.readFile, path.resolve(config.pluginModules, '.git', ref.split(': ')[1].trim()), 'utf8');
    return hash.trim();
}

function createAngularTemplate(templates) {
    let body = '';
    templates.forEach((template) => {
        body += `$templateCache.put("${template.name}", "${htmlJsStr(template.content)}");`;
    });
    return `$injector.invoke(['$templateCache', function ($templateCache) {${body}}]);`;
}

class Resources extends Model {}
class Users extends Model {}
module.exports = function resources(app) {
    app.use(route.post('/resources', function* () {
        let lastHash = this.request.body.hash,
            currentHash = yield getCurrentHash(),
            modules = [];

        let body = this.body = {
            hash: currentHash,
            modules: {}
        };

        if (lastHash !== currentHash) {
            let user = this.userData.user.get(),
                query = {user: user._id};
            if (user.klan) {
                query = {$or: [query, {klan: user.klan}]};
            }

            let resources = yield Resources.find(query);
            if (!resources) {
                return;
            }
            resources.reduce(function (modules, resource) {
                (resource.get('modules') || []).forEach(function (module) {
                    modules.push(module);
                });
                return modules;
            }, modules);
        }

        yield modules.map(function* (name) {
            let module = {templates: [], scripts: []},
                moduleDir = path.resolve(config.pluginModules, 'modules', name),
                info = fs.lstatSync(moduleDir);

            if (!info.isDirectory()) {
                return false;
            }

            let files = fs.readdirSync(moduleDir),
                metaFile = path.join(moduleDir, '.module'),
                metadata;

            if (fs.existsSync(metaFile)) {
                metadata = fs.readFileSync(metaFile, 'utf8') || '';
                if (metadata) {
                    metadata = `window.$injector.invoke(['cache', function (cache) {
                                    cache.push('modules', ${metadata});
                                }])`;
                }
            }
            files.forEach(function (file) {
                let ext = path.extname(file),
                    fileName = `${name}/${file}`,
                    fullPath = path.join(moduleDir, file);

                if (ext === '.html') {
                    module.templates.push({
                        name: fileName,
                        content: fs.readFileSync(fullPath, 'utf8')
                    });
                } else if (ext === '.js') {
                    module.scripts.push(fs.readFileSync(fullPath, 'utf8'));
                }
            });

            try {
                body.modules[name] = uglify.minify(
                    [].concat(...[createAngularTemplate(module.templates), module.scripts, metadata]).join(''),
                    {fromString: true, mangle: true, compress: true}
                ).code;
            } catch (error) {
                console.error(error);
            }
        });
    }));

    app.use(route.patch('/resources', function* (next) {
        this.assert(this.request.body.user, 400, 'Bad Request');
        this.assert(this.request.body.modules, 400, 'Bad Request');
        let user = this.userData.user,
            resources = yield Resources.findOne({user: user.get('_id')});

        if (!resources || !resources.get('ui') && !resources.get('admin')) {
            return yield* next;
        }

        resources = yield Resources.findOne({user: ObjectId(this.request.body.user)});
        if (!resources) {
            resources = new Resources({user: ObjectId(this.request.body.user)});
        }
        resources.set('modules', this.request.body.modules);
        resources.set('ui', this.request.body.ui);
        yield resources.save();
        this.body = resources;
    }));

    app.use(route.get('/resources', function* (next) {
        let user = this.userData.user,
            resources = yield Resources.findOne({user: user.get('_id')});

        if (!resources || !resources.get('ui') && !resources.get('admin')) {
            return yield* next;
        }

        if (this.query.id) {
            user = yield Users.findOne({id: +this.query.id});
            if (user) {
                resources = yield Resources.findOne({user: user.get('_id')});
            }
        }

        this.body = resources;
    }));

    app.use(route.get('/resources/modules', function* (next) {
        let resources = this.userData.resources;

        if (!resources || !resources.get('ui') && !resources.get('admin')) {
            return yield* next;
        }

        let modulesDir = path.resolve(config.pluginModules, 'modules'),
            directories = fs.readdirSync(modulesDir),
            modules = {};

        directories.forEach(function (dir) {
            let metaFile = path.join(modulesDir, dir, '.module'),
                metadata;
            if (fs.existsSync(metaFile)) {
                try {
                    metadata = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
                } catch (ignore) {
                    return;
                }

                modules[dir] = metadata;
            }
        });

        this.body = modules;
    }));
};
