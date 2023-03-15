const PENDING = 'PENDING';
const FULFILLED = 'FULFILLED';
const REJECT = 'REJECT';

function resolvePromise(promise2, x, resolve, reject) {
    if (promise2 === x) {
        return reject(new TypeError("Chaining cycle detected for promise #<MyPromise>"));
    }

    let called = false;
    if ((typeof x === 'object' && x != null) || typeof x === 'function') {
        try {
            let then = x.then;
            if (typeof then === 'function') {
                then.call(x, (y) => {
                    if (called) return;
                    called = true;
                    resolvePromise(promise2, y, resolve, reject);
                }, (r) => {
                    if (called) return;
                    called = true;
                    reject(r);
                });
            } else {
                resolve(x);
            }
        } catch (error) {
            if (called) return;
            called = true;
            reject(error);
        }
    } else {
        resolve(x);
    }
}

function isFunction(func) {
    return func && typeof func === 'function';
}

class MyPromise {

    constructor(executor) {
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;
        this.fulfilledCBQueue = []; // 成功回调队列
        this.rejectedCBQueue = []; // 失败回调队列

        const resolve = value => {
            if (value instanceof MyPromise) {
                value.then(resolve, reject);
                return;
            }

            if (this.status == PENDING) {
                this.value = value;
                this.status = FULFILLED;

                // 执行由 then 方法推入回调队列中的回调
                this.fulfilledCBQueue.forEach(cb => cb());
                this.fulfilledCBQueue = [];
            }
        }

        const reject = reason => {
            if (this.status == PENDING) {
                this.reason = reason;
                this.status = REJECT;
                this.rejectedCBQueue.forEach(cb => cb());
                this.rejectedCBQueue = [];
            }
        }

        // 必须捕获错误，因为 executor 回调函数抛出错误 算 reject
        try {
            executor(resolve, reject);
        } catch (error) {
            reject(error);
        }
    }

    then(onFulfilled, onRejected) {
        onFulfilled = isFunction(onFulfilled) ? onFulfilled : val => val;
        onRejected = isFunction(onRejected) ? onRejected : reason => { throw reason };
        // 创建新的promise 对象
        const promise2 = new Promise((resolve, reject) => {
            if (this.status == FULFILLED) {
                queueMicrotask(() => {
                    try {
                        let x = onFulfilled(this.value);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (error) {
                        reject(error);
                    }
                });
            }

            if (this.status == REJECT) {
                queueMicrotask(() => {
                    try {
                        let x = onRejected(this.reason);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (error) {
                        reject(error);
                    }
                });
            }

            if (this.status == PENDING) {
                this.fulfilledCBQueue.push(() => {
                    queueMicrotask(() => {
                        try {
                            let x = onFulfilled(this.value);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                this.rejectedCBQueue.push(() => {
                    queueMicrotask(() => {
                        try {
                            let x = onRejected(this.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
            }
        })

        // 返回新的 promise 对象
        return promise2;
    }

    catch(errorCallback) {
        return this.then(null, errorCallback);
    }

    finally(finallyCB) {
        return this.then(value => {
            return MyPromise.resolve(finallyCB).then(() => value);
        }, reason => {
            return MyPromise.resolve(finallyCB).then(() => {
                throw reason;
            })
        });
    }

    static resolve(value) {
        return new Promise((resolve, reject) => {
            resolve(value);
        })
    }

    static reject(reason) {
        return new Promise((resolve, reject) => {
            reject(reason);
        })
    }

    static all(promiseArr) {
        if (!isIterable(promiseArr)) { // 判断是否可迭代
            throw new TypeError(`object ${promiseArr} is not iterable (cannot read property Symbol(Symbol.iterator))`)
        }

        let valueArr = [];
        let storedValueNum = 0;
        let promiseArrLength = promiseArr.length;

        if (promiseArrLength === 0) { // 当参数为空数组时
            return MyPromise.resolve([]);
        }

        return new MyPromise((resolve, reject) => {
            promiseArr.forEach((promise, idx) => {
                if (isPromise(promise)) {
                    promise.then(value => {
                        putInValueArr(value, idx, resolve);
                    }, reject);
                } else {
                    putInValueArr(promise, idx, resolve);
                }
            })
        });

        function putInValueArr(value, idx, resolve) {
            valueArr[idx] = value;
            if (++storedValueNum === promiseArrLength) {
                resolve(valueArr);
            }
        }
    }

    static allSettled(promiseArr) {
        if (!isIterable(promiseArr)) { // 判断是否可迭代
            throw new TypeError(`object ${promiseArr} is not iterable (cannot read property Symbol(Symbol.iterator))`)
        }

        let valueArr = [];
        let storedValueNum = 0;
        let promiseArrLength = promiseArr.length;

        if (promiseArrLength === 0) { // 当参数为空数组时
            return MyPromise.resolve([]);
        }

        return new MyPromise((resolve, reject) => {
            promiseArr.forEach((promise, idx) => {
                if (isPromise(promise)) {
                    promise.then(value => {
                        putInValueArr('fulfilled', value, idx, resolve);
                    }, reason => {
                        putInValueArr('rejected', reason, idx, resolve);
                    });
                } else {
                    putInValueArr('fulfilled', promise, idx, resolve);
                }
            })

            function putInValueArr(status, value, idx, resolve) {
                switch (status) {
                    case 'fulfilled': {
                        valueArr[idx] = {
                            status,
                            value
                        }
                    };
                    case 'rejected': {
                        valueArr[idx] = {
                            status,
                            reason: value
                        }
                    };
                        break;
                }

                if (++storedValueNum === promiseArrLength) {
                    resolve(valueArr);
                }
            }
        })
    }

    static race(promiseArr) {
        if (!isIterable(promiseArr)) { // 判断是否可迭代
            throw new TypeError(`object ${promiseArr} is not iterable (cannot read property Symbol(Symbol.iterator))`)
        }

        if (promiseArr.length === 0) { // 当参数为空数组时
            return MyPromise.resolve([]);
        }

        return new MyPromise((resolve, reject) => {
            promiseArr.forEach(promise => {
                if (isPromise(promise)) {
                    promise.then(value => {
                        resolve(value);
                    }, reason => {
                        reject(reason);
                    })
                } else {
                    resolve(promise);
                }
            })
        })
    }
}

function isPromise(promise) {
    if (typeof promise === 'object' && promise != null || typeof promise === 'function') {
        let then = promise.then;
        return typeof then === 'function';
    }
    return false;
}

function isIterable(value) {
    if (value !== null && value !== undefined
        && typeof value[Symbol.iterator] === 'function') {
        return true;
    }
    return false;
}

MyPromise.defer = MyPromise.deferred = function () {
    let dfd = {};
    dfd.promise = new MyPromise((resolve, reject) => {
        dfd.resolve = resolve;
        dfd.reject = reject;
    });
    return dfd;
};

module.exports = MyPromise;
