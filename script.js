function parseCSSDuration(raw) {
	let parsed;
	const match = /([\d.]+)s/.exec(raw);
	if(match) {
		parsed = parseFloat(match[1]);
	}
	if(parsed !== 0 && !parsed) {
		throw new Error("Could not parse duration " + JSON.stringify(raw));
	}
	return parsed;
}

class Medic {
	constructor(element) {
		this.element = element || Medic.templateElement.cloneNode(true);
		this.secondaryElement = this.element.querySelector(".secondary");
		this.dropped = false;
		this.popped = false;
		this.extraBuild = 0;
		this.buildStart = Date.now();
		this.setupEventListeners();
		this.updateFromComputedCSS();
	}

	setupEventListeners() {
		for(const [event, selector, listener] of Medic.eventListenerSpec) {
			let elements = [];
			if(selector) {
				elements = Array.from(this.element.querySelectorAll(selector));
			} else {
				elements = [this.element];
			}
			for(const element of elements) {
				element.addEventListener(event, this[listener].bind(this));
			}
		}
	}

	updateFromComputedCSS() {
		if(!this.element.parentElement) return;
		const computed = getComputedStyle(this.element);
		this.buildTime = parseCSSDuration(computed.getPropertyValue("--build-time"));
		this.popTime = parseCSSDuration(computed.getPropertyValue("--pop-time"));
		// Tries to determine buildStart from computed style of progress bar
		const progressElement = this.element.querySelector(".build-progress");
		let topPixels;
		try {
			topPixels = parseFloat(
				/([\d.]+)px/.exec(getComputedStyle(progressElement)["top"])[1]
			);
		} catch(e) {}
		if(topPixels !== 0 && !topPixels) return;
		const progress = 1 - topPixels / progressElement.parentElement.clientHeight;
		this.buildStart = Date.now() - progress * this.buildTime * 1000;
	}

	get dropped() { return this._dropped }
	set dropped(dropped) {
		this._dropped = dropped;
		if(dropped) {
			this.element.classList.add("dropped");
		} else {
			this.element.classList.remove("dropped");
		}
	}

	get popped() { return this._popped }
	set popped(popped) {
		this._popped = popped;
		if(popped) {
			this.element.classList.add("popped");
		} else {
			this.element.classList.remove("popped");
		}
	}

	get extraBuild() { return this._extraBuild }
	set extraBuild(extraBuild) {
		this._extraBuild = extraBuild;
		this.element.style.setProperty("--extra-build", extraBuild);
	}

	nextSecondary() {
		let currentID;
		for(const className of Array.from(this.element.classList)) {
			if(className.startsWith(Medic.secondaryClassPrefix)) {
				this.element.classList.remove(className);
				currentID = className.substr(Medic.secondaryClassPrefix.length);
			}
		}
		const next = Medic.secondaries[
			(Medic.secondaries.findIndex(({id}) => id === currentID) + 1)
			% Medic.secondaries.length
		];
		this.element.classList.add(Medic.secondaryClassPrefix + next.id);
		this.secondaryElement.title = "Switch from " + next.name;
		this.updateFromComputedCSS();
	}

	render() {
		if(this.dropped) return;
		const of = (this.popped ? this.popTime : this.buildTime);
		const percentage = Math.max(0, Math.min(100,
			Math.round(Math.abs((Date.now() - this.buildStart) / 1000 / of * 100))
			+ (this.popped ? 0 : this.extraBuild)
		));
		this.element.querySelector(".build-percentage").textContent = percentage + "%";
	}

	drop() {
		this.dropped = true;
		this.popped = false;
		this.extraBuild = 0;
		this.element.classList.remove("popped");
	}

	build() {
		this.dropped = false;
		this.popped = false;
		this.buildStart = Date.now();
	}

	pop() {
		this.dropped = false;
		this.popped = true;
		this.buildStart = Date.now() + this.popTime * 1000;
		this.extraBuild = 0;
	}

	onClick() {
		if(this.dropped) {
			this.build();
		} else {
			if(this.popped) {
				this.drop();
			} else {
				this.pop();
			}
		}
	}

	onSawClick(event) {
		event.stopPropagation();
		this.extraBuild += 25;
	}

	onBuildProgressAnimationEnd(event) {
		if(event.animationName === "pop") {
			this.popped = false;
		}
	}

	onSecondaryClick(event) {
		event.stopPropagation();
		this.nextSecondary();
	}
}
Medic.templateElement = document.querySelector(".medic").cloneNode(true);
Medic.eventListenerSpec = [
	[       "click",                "",                     "onClick"],
	["animationend", ".build-progress", "onBuildProgressAnimationEnd"],
	[       "click",     ".adjust-saw",                  "onSawClick"],
	[       "click",      ".secondary",            "onSecondaryClick"]
];
Medic.secondaryClassPrefix = "secondary-";
Medic.secondaries = [];

const {cssRules: rules} = Array.from(document.styleSheets)
.find(sheet => sheet.href === location.href + "stylesheet.css");
for(const rule of Array.from(rules)) {
	if(rule instanceof CSSStyleRule) {
		const name = rule.style.getPropertyValue("--secondary-name");
		if(!name) continue;
		Medic.secondaries.push({
			name: JSON.parse(name),
			id: /\.medic\.secondary-([^-\s]+)/.exec(rule.selectorText)[1]
		});
	}
}

const medics = [];
function addMedic() {
	const medic = new Medic();
	medics.push(medic)
	document.body.appendChild(medic.element);
	medic.updateFromComputedCSS();
}
const medic = new Medic(document.querySelector(".medic"));
medics.push(medic);
medic.updateFromComputedCSS();

function render() {
	for(const medic of medics) {
		medic.render();
	}
	requestAnimationFrame(render);
}
render();

document.querySelector("#add")
.addEventListener("click", () => {
	addMedic();
});

{
	const div = document.createElement("div");
	div.style.animationDelay = "calc(1s * 5)";
	document.body.appendChild(div);
	if(getComputedStyle(div)["animation-delay"] !== "5s") {
		document.documentElement.classList.add("no-calc-in-animation-delay");
	}
	div.remove();
}
