
{
	const elements = new Map();
	const handleNode = node => {
		if(node.classList.contains("medic")) {
			const progress = node.querySelector(".build-progress");
			if(node.parentElement) {
				elements.set(progress, {
					computed: getComputedStyle(progress),
					medic: node
				});
			} else {
				elements.delete(progress);
			}
		}
	};
	Array.from(document.querySelectorAll(".medic")).forEach(handleNode);
	const observer = new MutationObserver(mutations => {
		for(const mutation of mutations) {
			for(const node of [
				...mutation.addedNodes,
				...mutation.removedNodes
			]) {
				handleNode(node);
			}
		}
	});
	observer.observe(
		document.querySelector("body"),
		{childList: true}
	);
	const animate = () => {
		for(const [element, {computed, medic}] of elements) {
			const [extraBuild, buildTime] = ["--extra-build", "--build-time"]
			.map(property => computed.getPropertyValue(property))
			.map(value => parseFloat(value.replace(/[^\d]/g, "")));
			if(medic.classList.contains("popped")) {
				element.style.animationDelay = "";
			} else {
				element.style.animationDelay = "" +
`${0 - extraBuild / 100 * buildTime}s, ${buildTime - extraBuild / 100 * buildTime}s`
				+ "";
			}
		}
		requestAnimationFrame(animate);
	};
	animate();
}
