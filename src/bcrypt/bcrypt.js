const bcrypt = require('bcryptjs');

export function compare(password, hash){
    return bcrypt.compareSync(password, hash);
}

export function makeHash(password){
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
}