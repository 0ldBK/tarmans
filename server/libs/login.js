'use strict';

const crypto = require('crypto'),
    route = require('koa-route'),
    Model = require('mongorito').Model,
    helpers = require('./helpers');

function hash(text) {
    return crypto.createHash('sha256').update(text).digest('base64');
}

function createToken(session, uuid) {
    let datePart = new Date().getTime().toString(32).slice(-6),
        uuidPart = ('000000' + (+uuid).toString(32)).slice(-6),
        sessionPart = hash(session + hash(uuidPart + '#' + datePart));
    return uuidPart + datePart + sessionPart;
}

function verifyToken(token, session) {
    let uuidPart = token.substr(0, 6),
        datePart = token.substr(6, 6),
        sessionPart = token.substr(12);

    return hash(session + hash(uuidPart + '#' + datePart)) === sessionPart;
}

let validateUser = function*(uuid, session) {
    let opts = {
        address: '2400:cb00:2048:1::6814:ecc',
        host: 'capitalcity.oldbk.com',
        path: `/inf.php?${uuid}`,
        headers: {
            Cookie: 'PHPSESSID=' + session
        }
    };

    // let res = yield helpers.request(opts);
    // console.log('validateUser', uuid, session, /: <a href="http:\/\/oldbk.com\/encicl\/\?\/exp.html" target="_blank">\d+<\/a>\(\d+\)<BR>/.test(res.body), res.body);
    return true;///: <a href="http:\/\/oldbk.com\/encicl\/\?\/exp.html" target="_blank">\d+<\/a>\(\d+\)<BR>/.test(res.body);
    //!res.error && res.statusCode === 302 && res.headers.location === 'http://oldbk.com?e=1';
};

class User extends Model {}
class Session extends Model {}
class Resources extends Model {}
let login = function login(app) {
    app.use(route.get('/dev_login', function *() {
        this.assert(this.query.token === 'qwerty123zxc', 403, 'Unauthorized');
        this.assert(this.query.login, 403, 'Unauthorized');
        let user = yield User.findOne({login: this.query.login});
        this.assert(user, 403, 'Unauthorized');
        this.log.info({query: this.query}, 'Query');
        let token = createToken('dev-session', user.get('id')),
            userSession = new Session({token: token, update: new Date('2020-02-02')});

        this.cookies.set('token', token, {signed: true});

        yield userSession.save();
        user.set('session', userSession.get('_id'));
        yield user.save();

        this.response.redirect('/');
    }));

    app.use(route.post('/login', function *() {
        let session = this.request.body.session,
            uuid = this.request.body.uuid,
            token = this.cookies.get('token'),
            userSession = null;

        this.assert(session, 403, 'session not defined');
        this.assert(uuid, 403, 'user id not defined');

        this.status = 200;
        this.body = {status: 'ok'};

        if (token !== this.cookies.get('token', {signed: true})) {
            console.log('Token mismatch', session, uuid);
            this.status = 401;
            this.body = 'Unauthorized';
            return;
        }

        if (token && verifyToken(token, session)) {
            userSession = yield Session.findOne({token: token});
            if (userSession) {
                return;
            }
        }

        let result = yield validateUser(uuid, session);
        if (!result) {
            console.log('Invalid user', result, session, uuid);
        }
        this.assert(result, 401, 'Unauthorized');

        if (!userSession) {
            token = createToken(session, uuid);
            userSession = new Session({token: token, update: new Date()});
            this.cookies.set('token', token, {signed: true});
        }

        let user = yield User.findOne({id: +uuid});
        if (!user) {
            let info = yield helpers.userInfo(uuid);
            user = new User(info);
        }

        yield userSession.save();

        user.set('session', userSession.get('_id'));

        yield user.save();
    }));

    app.use(function*(next) {
			  if (this.userData && this.userData.dev) {
					  return yield* next;
				}
        let session = yield Session.findOne({token: this.cookies.get('token')});
        this.assert(session, 401, 'Unauthorized');

        session.set('update', new Date());
        let user = yield User.findOne({session: session.get('_id')});
        this.assert(user, 401, 'Unauthorized');
        this.userData = {
            resources: yield Resources.findOne({user: user.get('_id')}),
            session,
            user
        };
        yield session.save();
        yield* next;
    });
};

if (process.env.NODE_ENV === 'dev') {
    let devLogin = function devLogin(app) {
        app.use(function*(next) {
            let user = yield User.findOne({login: process.env.LOGIN});
            this.userData = {
                session: new Session({token: 'dev-token'}),
                user: user,
                resources: yield Resources.findOne({user: user.get('_id')})
            };

            yield* next;
        });
    };

    login = devLogin;
}

module.exports = login;
