var DOMAIN = '';
var fs = require('fs'),
    path = require('path'),
    gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    //packer = require('gulp-packer'),
    //streamify = require('gulp-streamify'),
    ChromeExtension = require('crx'),
    exec = require('child_process').exec;

function copyFiles(dest) {
    var files = [].concat.apply([], [].slice.call(arguments, 1)),
        callback = files.pop();

    return gulp.src(files, {base: '.'}).pipe(gulp.dest(dest))
        .on('finish', callback);
}

function parseArgs() {
    var params = {};

    function parseArg(arg, offset, separator) {
        arg = arg.substr(offset);
        var separatorIndex = arg.indexOf(separator),
            data = arg.substr(separatorIndex + 1),
            key = arg.substr(0, separatorIndex) || data;
        data = data === key || data;
        params[key] = data;
    }

    process.argv.forEach(function (argv) {
        if (argv.substr(0, 2) === '--') {
            parseArg(argv, 2, '=');
        } else if (argv.substr(0, 1) === '-') {
            parseArg(argv, 1, ' ');
        }
    });

    return params;
}

function rmdir(dir) {
    if (!fs.existsSync(dir)) {
        return;
    }
    var list = fs.readdirSync(dir);
    for (var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);

        if (filename == '.' || filename == '..') {
            // pass these files
        } else if (stat.isDirectory()) {
            // rmdir recursively
            rmdir(filename);
        } else {
            // rm fiilename
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
}

var args = parseArgs();

gulp.task('build', function (done) {
    var buildDir = path.join(__dirname, 'build'),
        manifest = require('./manifest.json'),
        pkg = require('./package.json'),
        scripts = [],
        pluginName = 'tarman-plugin.crx';

    scripts = [].concat.apply(scripts, manifest['content_scripts'].map(function (cs) {
        return cs.js;
    }));

    rmdir(buildDir);
    gulp.src(scripts, {base: '.'})
        .pipe(uglify({mangle: true, compress: true}))
        //.pipe(streamify(packer({base62: true, shrink: true})))
        .pipe(gulp.dest(buildDir + '/'))
        .on('finish', function () {
            var toCopy = [
                'modules/popup/popup.html', 'modules/popup/popup.js', 'assets/**'
            ];
            toCopy = toCopy.concat(manifest['web_accessible_resources'], manifest.background.scripts);
            copyFiles(buildDir, toCopy, function () {
                if (args.version) {
                    pkg.version = manifest.version = args.version;
                }
                fs.writeFileSync(path.join(buildDir, 'manifest.json'), JSON.stringify(manifest), 'utf-8');
                fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
                fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify(pkg, null, 2), 'utf-8');
                var crx = new ChromeExtension({
                    privateKey: fs.readFileSync(path.join(__dirname, 'build.key')),
                    codebase: 'https://' + DOMAIN + '/' + pluginName,
                    rootDirectory: buildDir
                });
                crx.pack().then(function (data) {
                    var updateXML = crx.generateUpdateXML(),
                        updateXMLPath = path.join(__dirname, 'update.xml'),
                        pluginPath = path.join(__dirname, pluginName);
                    fs.writeFileSync(updateXMLPath, updateXML);
                    fs.writeFileSync(pluginPath, data);
                    if (args.upload) {
                        var execCommand = 'scp -r ' + [updateXMLPath, pluginPath].join(' ') +
                            'user@' + DOMAIN + ':path';
                        exec(execCommand, function () {
                            delete manifest['update_url'];
                            fs.writeFileSync(path.join(buildDir, 'manifest.json'), JSON.stringify(manifest), 'utf-8');
                            execCommand = 'bash -c "cd ' + buildDir + ';rm -rf ' + __dirname +
                                '/ext.zip;zip -r ' + __dirname + '/ext.zip ./"';
                            exec(execCommand, function () {
                                exec('git tag -s -f -m v' + manifest.version + '  v' + manifest.version, function () {
                                    exec('git commit -sam "v' + manifest.version + '"', function () {
                                        console.log('Plugin uploaded!');
                                        done();
                                    });
                                });
                            });
                        });
                    } else {
                        done();
                    }
                }).catch(function (error) {
                    done(error);
                });
            });
        });
});
