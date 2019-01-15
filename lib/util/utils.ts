// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import AsyncLock from "async-lock";
export { AsyncLock };
/**
 * Describes the options that can be provided to create an async lock.
 * @interface AsyncLockOptions
 */
export interface AsyncLockOptions {
  /**
   * @property {number} [timeout] The max timeout. Default is: 0 (never timeout).
   */
  timeout?: number;
  /**
   * @property {number} [maxPending] Maximum pending tasks. Default is: 1000.
   */
  maxPending?: number;
  /**
   * @property {boolean} [domainReentrant] Whether lock can reenter in the same domain.
   * Default is: false.
   */
  domainReentrant?: boolean;
  /**
   * @property {any} [Promise] Your implementation of the promise. Default is: global promise.
   */
  Promise?: any;
}

/**
 * Describes the servicebus connection string model.
 * @interface ServiceBusConnectionStringModel
 */
export interface ServiceBusConnectionStringModel {
  Endpoint: string;
  SharedAccessKeyName: string;
  SharedAccessKey: string;
  EntityPath?: string;
  [x: string]: any;
}

/**
 * Describes the eventhub connection string model.
 * @interface EventHubConnectionStringModel
 */
export interface EventHubConnectionStringModel {
  Endpoint: string;
  SharedAccessKeyName: string;
  SharedAccessKey: string;
  EntityPath?: string;
  [x: string]: any;
}

/**
 * Describes the stroage connection string model.
 * @interface StorageConnectionStringModel
 */
export interface StorageConnectionStringModel {
  DefaultEndpointsProtocol: string;
  AccountName: string;
  AccountKey: string;
  EndpointSuffix: string;
  [x: string]: any;
}

/**
 * Describes the iothub connection string model.
 * @interface IotHubConnectionStringModel
 */
export interface IotHubConnectionStringModel {
  HostName: string;
  SharedAccessKeyName: string;
  SharedAccessKey: string;
  DeviceId?: string;
}

/**
 * Defines an object with possible properties defined in T.
 * @type ParsedOutput<T>
 */
export type ParsedOutput<T> = {
  [P in keyof T]: T[P];
};

/**
 * Parses the connection string and returns an object of type T.
 *
 * Connection strings have the following syntax:
 *
 * ConnectionString ::= Part { ";" Part } [ ";" ] [ WhiteSpace ]
 * Part             ::= [ PartLiteral [ "=" PartLiteral ] ]
 * PartLiteral      ::= [ WhiteSpace ] Literal [ WhiteSpace ]
 * Literal          ::= ? any sequence of characters except ; or = or WhiteSpace ?
 * WhiteSpace       ::= ? all whitespace characters including \r and \n ?
 *
 * @param {string} connectionString The connection string to be parsed.
 * @returns {ParsedOutput<T>} ParsedOutput<T>.
 */
export function parseConnectionString<T>(connectionString: string): ParsedOutput<T> {
  return connectionString.trim().split(';').reduce((acc, part) => {
    part = part.trim();
    const splitIndex = part.indexOf('=');

    if (part === '') {
      // parts can be empty
      return acc;
    }

    if (splitIndex === -1) {
      throw new Error("Connection string malformed: each part of the connection string must have an `=` assignment.");
    }

    const key = part.substring(0, splitIndex).trim();
    const value = part.substring(splitIndex + 1).trim();

    return {
      ...acc,
      [key]: value
    };
  }, {} as any);
}

/**
 * Gets a new instance of the async lock with desired settings.
 * @param {AsyncLockOptions} [options] The async lock options.
 * @returns {AsyncLock} AsyncLock
 */
export function getNewAsyncLock(options?: AsyncLockOptions): AsyncLock {
  return new AsyncLock(options);
}

/**
 * @constant {AsyncLock} defaultLock The async lock instance with default settings.
 */
export const defaultLock: AsyncLock = new AsyncLock({ maxPending: 10000 });

/**
 * Describes a Timeout class that can wait for the specified amount of time and then resolve/reject
 * the promise with the given value.
 * @class Timout
 */
export class Timeout {

  private _timer?: number;

  set<T>(t: number, value?: T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.clear();
      const callback = value ? () => reject(new Error(`${value}`)) : resolve;
      this._timer = setTimeout(callback, t);
    });
  }

  clear(): void {
    if (this._timer) {
      clearTimeout(this._timer);
    }
  }

  wrap<T>(promise: Promise<T>, t: number, value?: T): Promise<T> {
    const wrappedPromise = this._promiseFinally(promise, () => this.clear());
    const timer = this.set(t, value);
    return Promise.race([wrappedPromise, timer]);
  }

  private _promiseFinally<T>(promise: Promise<T>, fn: Function): Promise<T> {
    const success = (result: T) => {
      fn();
      return result;
    };
    const error = (e: Error) => {
      fn();
      return Promise.reject(e);
    };
    return Promise.resolve(promise).then(success, error);
  }

  static set<T>(t: number, value?: T): Promise<T> {
    return new Timeout().set(t, value);
  }

  static wrap<T>(promise: Promise<T>, t: number, value?: T): Promise<T> {
    return new Timeout().wrap(promise, t, value);
  }
}

/**
 * A wrapper for setTimeout that resolves a promise after t milliseconds.
 * @param {number} t - The number of milliseconds to be delayed.
 * @param {T} value - The value to be resolved with after a timeout of t milliseconds.
 * @returns {Promise<T>} - Resolved promise
 */
export function delay<T>(t: number, value?: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), t));
}

/**
 * Generates a random number between the given interval
 * @param {number} min Min number of the range (inclusive).
 * @param {number} max Max number of the range (inclusive).
 */
export function randomNumberFromInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Type declaration for a Function type where T is the input to the function and V is the output
 * of the function.
 */
export type Func<T, V> = (a: T) => V;

/*
 * Executes an array of promises sequentially. Inspiration of this method is here:
 * https://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html. An awesome blog on promises!
 *
 * @param {Array} promiseFactories An array of promise factories(A function that return a promise)
 *
 * @param {any} [kickstart] Input to the first promise that is used to kickstart the promise chain.
 * If not provided then the promise chain starts with undefined.
 *
 * @return A chain of resolved or rejected promises
 */
export function executePromisesSequentially(promiseFactories: Array<any>, kickstart?: any): Promise<any> {
  let result = Promise.resolve(kickstart);
  promiseFactories.forEach((promiseFactory) => {
    result = result.then(promiseFactory);
  });
  return result;
}

/**
 * Determines whether the given connection string is an iothub connection string.
 * @param {string} connectionString The connection string.
 * @return {boolean} boolean.
 */
export function isIotHubConnectionString(connectionString: string): boolean {
  if (!connectionString || typeof connectionString !== "string") {
    throw new Error("connectionString is a required parameter and must be of type string.");
  }
  let result: boolean = false;
  const model: any = parseConnectionString<any>(connectionString);
  if (model && model.HostName && model.SharedAccessKey && model.SharedAccessKeyName) {
    result = true;
  }
  return result;
}
