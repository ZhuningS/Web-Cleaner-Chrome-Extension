(function() {
	var states = ['unset', 'one', 'two', 'three', 'all'];
	var meterStates = ['disabled', 'unset', 'set'];
	var $nodes = $(states.map(function(state) {
		return '#daygrid li.' + state;
	}).join(', '));
	var $meterNodes = $(meterStates.map(function(state) {
		return '#daygrid .meter.' + state;
	}).join(', '));
	var schedule = $nodes.get().map(function(){ return 4; });
	var meter = $meterNodes.get().map(function(){ return 0; });

	display();

	$nodes.click(function() {
		var index = $nodes.index(this);
		this.classList.remove(states[schedule[index]]);
		schedule[index] = (schedule[index] + 1) % states.length;
		this.classList.add(states[schedule[index]]);
		document.getElementsByName('schedule')[0].value = JSON.stringify(schedule);
	});

	$meterNodes.click(function() {
		var index = $meterNodes.index(this);
		this.classList.remove(meterStates[meter[index]]);
		meter[index] = (meter[index] + 1) % meterStates.length;
		this.classList.add(meterStates[meter[index]]);
		document.getElementsByName('meter')[0].value = JSON.stringify(meter);
	});

	function display() {
		$nodes.each(function(i, node) {
			node.classList.remove.apply(node.classList, states);
			node.classList.add(states[schedule[i]]);
		});
		$meterNodes.each(function(i, node) {
			node.classList.remove.apply(node.classList, meterStates);
			node.classList.add(meterStates[meter[i]]);
		});
	}

	window.updateSchedule = function() {
		try {
			var newSchedule = JSON.parse(document.getElementsByName('schedule')[0].value);
			if (newSchedule instanceof Array && newSchedule.length === schedule.length && newSchedule.every(function(s) {
				return typeof s === 'number' && s >= 0 && s < states.length;
			})) {
				schedule = newSchedule;
			}
			var newMeter = JSON.parse(document.getElementsByName('meter')[0].value);
			if (newMeter instanceof Array && newMeter.length === meter.length && newMeter.every(function(s) {
				return typeof s === 'number' && s >= 0 && s < meterStates.length;
			})) {
				meter = newMeter;
			}
		} catch (e) {}
		display();
	};
}());