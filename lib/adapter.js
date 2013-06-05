
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;

/**
 * Module exports.
 */

module.exports = Adapter;

/**
 * Memory adapter constructor.
 *
 * @param {Namespace} nsp
 * @api public
 */

function Adapter(nsp){
  this.nsp = nsp;
  this.rooms = {};
  this.sids = {};
}

/**
 * Inherits from `EventEmitter`.
 */

Adapter.prototype.__proto__ = Emitter.prototype;

/**
 * Adds a socket from a room.
 *
 * @param {String} socket id
 * @param {String} room name
 * @param {Function} callback
 * @api public
 */

Adapter.prototype.add = function(id, room, fn){
	(this.sids[id] || {})[room] = true;
	(this.rooms[room] = this.rooms[room] || {})[id] = true;
	if (fn) process.nextTick(fn.bind(null, null));
};

/**
 * Removes a socket from a room.
 *
 * @param {String} socket id
 * @param {String} room name
 * @param {Function} callback
 * @api public
 */

Adapter.prototype.del = function(id, room, fn){
	var _sid;
	if (_sid = this.sids[id])
		delete _sid[room];
	this._delFromRoom(id, room);
	if (fn) process.nextTick(fn.bind(null, null));
};

/**
 * Removes the socket from the specified room
 * 
 * @param {String} socket id
 * @param {String} room name
 * @returns {undefined}
 */
Adapter.prototype._delFromRoom = function(id, room) {
	var _room;
	if (_room = this.rooms[room]) {
		delete _room[id];
		// Deletes the room when no one is using it
		// If we don't, this is a potential memory leak
		if (!Object.keys(_room).length)
			delete this.rooms[room];
	}
};

/**
 * Removes a socket from all rooms it's joined.
 *
 * @param {String} socket id
 * @api public
 */

Adapter.prototype.delAll = function(id, fn){
	var rooms = this.sids[id];
	if (rooms) {
		for (var room in rooms) {
			_delFromRoom(id, room);
		}
	}
	delete this.sids[id];
};

/**
 * Broadcasts a packet.
 *
 * Options:
 *  - `flags` {Object} flags for this packet
 *  - `except` {Array} sids that should be excluded
 *  - `rooms` {Array} list of rooms to broadcast to
 *
 * @param {Object} packet object
 * @api public
 */

Adapter.prototype.broadcast = function(packet, opts){
  var rooms = opts.rooms || [];
  var except = opts.except || [];
  var ids = {};
  var socket;

  if (rooms.length) {
    for (var i = 0; i < rooms.length; i++) {
      var room = this.rooms[rooms[i]];
      if (!room) continue;
      for (var id in room) {
        if (ids[id] || ~except.indexOf(id)) continue;
        socket = this.nsp.connected[id];
        if (socket) {
          socket.packet(packet);
          ids[id] = true;
        }
      }
    }
  } else {
    for (var id in this.sids) {
      if (~except.indexOf(id)) continue;
      socket = this.nsp.connected[id];
      if (socket) socket.packet(packet);
    }
  }
};
