
/// Editor based around w3css
class W3Editor extends Editor {

	#injected = []

	constructor(cfg) {
		super(cfg)
		window.onbeforeunload = () => this.isInit && this.getDiff().length > 0
		this.#createInputBar()
		let style = html(`
			<style>
				[contenteditable=true] {
					border: 1px solid blue;
				}
				[contenteditable=false]:not([decorator]) {
					border: 1px solid red;
				}
				[contenteditable] * {
					min-height: 32px;
					min-width: 32px;
				}
				[contenteditable] :empty {
					border: 1px solid purple;
				}
				[decorator], [decorator] * {
					user-select: none;
					-moz-user-select: none;
					-khtml-user-select: none;
					-webkit-user-select: none;
					-o-user-select: none;
				}
			</style>
		`)
		this.#injected.push(style)
		document.head.appendChild(style)
	}

	teardown() {
		super.teardown()
		for (let el of this.#injected) {
			el.remove()
		}
	}

	onChangeTarget() {
		if (this.targetElement) {
			this.pathdesc.innerText = this.getPath(this.targetElement).join(" > ")
		}
	}
	onChange() {
		if (this.targetElement) {
			this.pathdesc.innerText = this.getPath(this.targetElement).join(" > ")
		}
	}

	#createInputBar() {
		let barCard = document.createElement("div")
		barCard.style.zIndex = 50
		barCard.style.width = "100vw"
		barCard.style.position = "sticky"
		barCard.style.top = 0
		setClasses(barCard, "w3-card-4 w3-white")

		let bar1 = document.createElement("div")
		barCard.appendChild(bar1)
		setClasses(bar1, "w3-bar")

		this.pathdesc = document.createElement("code")
		this.pathdesc.classList.add("w3-right", "w3-bar-item")
		this.#injected.push(this.pathdesc)
		bar1.appendChild(this.pathdesc)
		for (let v of this.cfg.basicStyles) {
			let b = document.createElement("BUTTON")
			setClasses(b, "w3-bar-item w3-button")
			b.innerText = v
			b.onclick = () => this.style(v)
			bar1.appendChild(b)
		}

		for (let [k,v] of Object.entries(this.cfg.insertable)) {
			let b = document.createElement("BUTTON")
			setClasses(b, "w3-bar-item w3-button")
			b.innerText = k
			b.onclick = () => this.insertNode(v)
			bar1.appendChild(b)
		}
		for (let [k, v] of Object.entries(this.cfg.layout)) {
			if (v.hidden) continue
			let b = document.createElement("BUTTON")
			setClasses(b, "w3-bar-item w3-button")
			b.innerText = k
			b.onclick = () => {
				this.createLayOutElement(k)
			}
			bar1.appendChild(b)
		}

		let bar2 = document.createElement("div")
		barCard.appendChild(bar2)
		setClasses(bar2, "w3-bar")
		let b = document.createElement("INPUT")
		setClasses(b, "w3-bar-item w3-button")
		b.type = "file"
		b.onchange = (event) => this.cfg.onUpload(event)
		bar2.appendChild(b)
		b = document.createElement("BUTTON")
		setClasses(b, "w3-bar-item w3-button")
		b.innerText = "Save"
		b.onclick = () => this.save()
		bar2.appendChild(b)

		b = document.createElement("BUTTON")
		setClasses(b, "w3-bar-item w3-button")
		b.innerText = "Close"
		b.onclick = () => {
			if (this.getDiff().length == 0 || confirm("Close editor?")) {
				this.teardown()
			}
		}
		bar2.appendChild(b)

		b = document.createElement("BUTTON")
		setClasses(b, "w3-bar-item w3-button")
		b.innerText = "Clean"
		b.onclick = () => {
			this.clean(true)
		}
		bar2.appendChild(b)


		this.#injected.push(barCard)
		document.body.prepend(barCard)
	}

	save() {
		this.clean(true)
		for (let [el,content] of this.getDiff()) {
			let blob = new Blob([content], {type: "text/plain"})
			let url = URL.createObjectURL(blob)
			let a = document.createElement("a")
			a.href = url;
			a.download = el.attributes.editable?.value || ""
			document.body.appendChild(a);
			a.click();
			setTimeout(function() {
					document.body.removeChild(a);
					window.URL.revokeObjectURL(url);
			}, 0);
		}
	}

}
