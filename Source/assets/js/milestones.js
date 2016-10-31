
var milestones = (function(s) {
	var s = [
		{ unit: 'second',  values: [30, 60] },
		{ unit: 'minute',  values: [2, 5, 15, 30, 45] },
		{ unit: 'hour',  values: [1, 4, 8, 16, 24, 36] },
		{ unit: 'day',   values: [2, 5, 10, 14, 21] },
		{ unit: 'day',   values: [30, 45, 60, 75, 90, 120, 180, 270] },
		{ unit: 'month', values: [12, 18, 24, 48, 87] },
		{ unit: 'year',  values: [10, 15, 20, 30, 40, 50, 75] },
		{ unit: 'year',  values: [100] },
		{ unit: 'year',  values: [200, 500] },
		{ unit: 'year',  values: [1000, Infinity] }
	];
	var props = {milli: 'Milliseconds', second: 'Seconds', minute: 'Minutes', hour: 'Hours', day: 'Date', month: 'Month', year: 'FullYear'};
	var currentStage; // index
	var nextMilestone; // timestamp
	var installDate = stats.getEvents('installed')[0].time;
	var lastOrgasm = stats.getEvents(['cummed', 'milked', 'ruined']).pop();
	var listeners = new Map();
	var reset = true;
	stats.listen(['cummed', 'milked', 'ruined'], function(events) {
		lastOrgasm = events.pop();
		reset = true;
		milestones.update();
	});
	return {
		startNotify: function() {
			milestones.listen('milestone', notify);
		},
		stopNotify: function() {
			milestones.unlisten('milestone', notify);
		},
		update: function() {
			updateMilestone();
			schedule();
		},
		getCurrentStage: function() {
			updateMilestone();
			var stage = currentStage;
			return {
				unit: s[stage].unit,
				getInfo: function() {
					var values = s[stage].values.slice();
					//if (stage === 0) {
						values.unshift(0);
					//}
					if (stage + 1 < s.length) {
						values.push(convertUnit(s[stage + 1].values[0], s[stage + 1].unit, s[stage].unit));
						if (!(values[values.length - 2] < values[values.length - 1])) {
							console.error('error converting s[' + (stage+1) + '].values[0] (' + s[stage + 1].values[0] + ') from ' + s[stage+1].unit + 's to ' + s[stage].unit + 's -> ' + values[values.length - 1]);
						}
					}
					var mss = values.map(function(value) {
						return {
							value: value,
							unit: s[stage].unit,
							time: fromUnit(value, s[stage].unit)
						};
					});
					mss.unit = s[stage].unit;
					return mss;
				}
			};
		},
		getNextMilestoneTime: function() {
			updateMilestone();
			return nextMilestone;
		},
		getLast: function() {
			updateMilestone();
			var ms = getNextMilestone();
			ms.i -= 1;
			return ms.i < 0 ? null : {
				stage: ms.stage,
				i: ms.i,
				value: s[ms.stage].values[ms.i],
				unit: s[ms.stage].unit,
				time: getMilestone(ms.stage, ms.i),
				name: this.name(ms.stage, ms.i)
			};
		},
		name: function(stage, i) {
			while (s[stage].values.length <= i) {
				i -= s[stage].values.length;
				stage += 1;
			}
			return s[stage].values[i] + ' ' + s[stage].unit + (s[stage].values[i] === 1 ? '' : 's');
		},
		listen: function(names, listener) {
			if (!Array.isArray(names)) {
				names = [names];
			}
			names.forEach(function(name) {
				if (!listeners.has(name)) {
					listeners.set(name, [listener]);
					if (['stage', 'milestone'].indexOf(name) >= 0) {
						schedule();
					}
				} else if (listeners.get(name).indexOf(listener) < 0) {
					listeners.get(name).push(listener);
				}
			});
		},
		unlisten: function(names, listener) {
			if (!Array.isArray(names)) {
				names = [names];
			}
			names.forEach(function(name) {
				if (listeners.has(name)) {
					var index = listeners.get(name).indexOf(listener);
					if (index >= 0) {
						listeners.get(name).splice(index, 1);
						if (!listeners.get(name).length) {
							listeners.delete(name);
							if (['stage', 'milestone'].indexOf(name) >= 0) {
								schedule();
							}
						}
					}
				}
			});
		}
	};
	var timeout;
	function schedule() {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
		if (listeners.has('stage') || listeners.has('milestone')) {
			updateMilestone();
			timeout = setTimeout(function() {
				timeout = null;
				milestones.update();
			}, nextMilestone - Date.now());
		}
	}
	function trigger(name, value) {
		if (listeners.has(name)) {
			listeners.get(name).slice().forEach(function(listener) {
				try {
					listener(value);
				} catch (e) {
					console.error(e);
					milestones.unlisten(name, listener);
				}
			});
		}
	}
	function notify() {
		var ms = getNextMilestone();
		chrome.notifications.create({
			type: "basic",
			title: "Milestone Reached",
			message: "Congratulations! You didn't orgasm for " + milestones.name(ms.stage, ms.i - 1) + ". Keep up the good work!",
			iconUrl: "assets/img/joseph'slogo2(transparent).png",
			eventTime: Date.now()
		}, function(){});
	}
	function updateMilestone() {
		var ms = getNextMilestone();
		var timestamp = getMilestone(ms.stage, ms.i).getTime();
		var newStage, newMilestone;
		if (timestamp > nextMilestone) {
			newMilestone = true;
			if (ms.i === 1) {
				newStage = true;
			}
		}
		currentStage = ms.stage;
		nextMilestone = timestamp;
		if (reset) {
			reset = false;
			trigger('reset');
		} else {
			if (newStage) trigger('stage');
			if (newMilestone) {
				trigger('milestone');
				stats.addEvent('milestone', null, {
					stage: ms.stage,
					index: ms.i - 1
				});
			}
		}
	}
	function getNextMilestone() {
		var now = Date.now();
		for (var stage = 0; stage < s.length; ++stage) {
			if (now < getMilestone(stage, s[stage].values.length).getTime()) {
				break;
			}
		}
		for (var i = 0; i <= s[stage].values.length; ++i) {
			if (now < getMilestone(stage, i).getTime()) {
				break;
			}
		}
		return {stage: stage, i: i};
	}
	function getMilestone(stage, i) {
		while (stage < s.length && s[stage].values.length <= i) {
			i -= s[stage].values.length;
			stage += 1;
		}
		if (s.length <= stage) {
			stage = s.length - 1;
			i = s[stage].length - 1;
		}
		var d = new Date(lastOrgasm ? lastOrgasm.time : installDate);
		add(d, s[stage].unit, s[stage].values[i]);
		return d;
	}
	function convertUnit(value, from, to) {
		if (from === to) {
			return value;
		}
		return toUnit(fromUnit(value, from), to);
	}
	function fromUnit(value, from) {
		var basis = lastOrgasm ? lastOrgasm.time : installDate;
		var d = new Date(basis);
		add(d, from, value);
		return d.getTime();
	}
	function toUnit(value, to) {
		var basis = lastOrgasm ? lastOrgasm.time : installDate;
		var d = new Date(value);
		var result = 0;
		while (d.getTime() > basis) {
			var x = 1; // pretty dumb
			result += x;
			add(d, to, -x);
		}
		return result;
	}
	function add(date, unit, value) {
		set(date, unit, get(date, unit) + value);
		function get(date, unit) {
			return Date.prototype['getUTC' + props[unit]].call(date);
		}
		function set(date, unit, value) {
			Date.prototype['setUTC' + props[unit]].call(date, value);
		}
	}
}());

milestones.startNotify();