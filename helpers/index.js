let sharedCtx = {
    version: 1,
};

exports.sharedCtx = () => sharedCtx;
exports.mergeProps = (props) => {
    Object.assign(sharedCtx, props);
}
exports.setCtx = (ctx) => {
    if (sharedCtx.version !== ctx.version) {
        throw `Incompatible shared contexts assigning version ${ctx.version} to version ${sharedCtx.version}`;
    }
    sharedCtx = ctx;
};
exports.utils = require('./utils');
exports.regex = require('./regex');
exports.normalizers = require('./normalizers');
exports.xml = require('./xml');
