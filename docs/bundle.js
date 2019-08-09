
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const gifState = {
      PAUSED: "paused",
      PLAYING: "playing"
    };

    /* src/Gif.svelte generated by Svelte v3.7.1 */

    const file = "src/Gif.svelte";

    function create_fragment(ctx) {
    	var div, img, img_src_value, img_alt_value, dispose;

    	return {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			attr(img, "class", "gif svelte-sm968z");
    			attr(img, "src", img_src_value = ctx.state === gifState.PAUSED ? ctx.gif.srcStill : ctx.gif.srcMotion);
    			attr(img, "alt", img_alt_value = ctx.gif.title);
    			add_location(img, file, 33, 2, 673);
    			attr(div, "class", "container svelte-sm968z");
    			add_location(div, file, 32, 0, 646);

    			dispose = [
    				listen(img, "mouseenter", ctx.handleMouseEnter),
    				listen(img, "mouseleave", ctx.handleMouseLeave)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, img);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.state || changed.gif) && img_src_value !== (img_src_value = ctx.state === gifState.PAUSED ? ctx.gif.srcStill : ctx.gif.srcMotion)) {
    				attr(img, "src", img_src_value);
    			}

    			if ((changed.gif) && img_alt_value !== (img_alt_value = ctx.gif.title)) {
    				attr(img, "alt", img_alt_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { gif, state = gifState.STILL } = $$props;

      const handleMouseEnter = () => {
        if (state === gifState.PAUSED) $$invalidate('state', state = gifState.PLAYING);
      };

      const handleMouseLeave = () => {
        if (state === gifState.PLAYING) $$invalidate('state', state = gifState.PAUSED);
      };

    	const writable_props = ['gif', 'state'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Gif> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('gif' in $$props) $$invalidate('gif', gif = $$props.gif);
    		if ('state' in $$props) $$invalidate('state', state = $$props.state);
    	};

    	return {
    		gif,
    		state,
    		handleMouseEnter,
    		handleMouseLeave
    	};
    }

    class Gif extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["gif", "state"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.gif === undefined && !('gif' in props)) {
    			console.warn("<Gif> was created without expected prop 'gif'");
    		}
    	}

    	get gif() {
    		throw new Error("<Gif>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gif(value) {
    		throw new Error("<Gif>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Gif>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Gif>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Giphy.svelte generated by Svelte v3.7.1 */

    const file$1 = "src/Giphy.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.gif = list[i];
    	child_ctx.index = i;
    	return child_ctx;
    }

    // (65:4) {#each gifs as gif, index}
    function create_each_block(ctx) {
    	var current;

    	var gif = new Gif({
    		props: {
    		gif: ctx.gif,
    		state: ctx.gif.state,
    		"data-image-id": ctx.index
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			gif.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(gif, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var gif_changes = {};
    			if (changed.gifs) gif_changes.gif = ctx.gif;
    			if (changed.gifs) gif_changes.state = ctx.gif.state;
    			gif.$set(gif_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(gif.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(gif.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(gif, detaching);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var div4, div2, div0, input0, t0, input1, t1, div1, button0, t3, button1, t5, div3, current, dispose;

    	var each_value = ctx.gifs;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Play All";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Pause All";
    			t5 = space();
    			div3 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr(input0, "placeholder", "Search for a gif");
    			add_location(input0, file$1, 55, 6, 1330);
    			attr(input1, "type", "submit");
    			add_location(input1, file$1, 56, 6, 1402);
    			add_location(div0, file$1, 54, 4, 1317);
    			add_location(button0, file$1, 59, 6, 1494);
    			add_location(button1, file$1, 60, 6, 1546);
    			attr(div1, "class", "controls svelte-1tt2qhs");
    			add_location(div1, file$1, 58, 4, 1464);
    			attr(div2, "class", "form-wrapper svelte-1tt2qhs");
    			add_location(div2, file$1, 53, 2, 1285);
    			attr(div3, "class", "gifs-container svelte-1tt2qhs");
    			add_location(div3, file$1, 63, 2, 1618);
    			add_location(div4, file$1, 52, 0, 1276);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "click", ctx.searchGif),
    				listen(button0, "click", ctx.playAll),
    				listen(button1, "click", ctx.pauseAll)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div2);
    			append(div2, div0);
    			append(div0, input0);

    			input0.value = ctx.searchTerm;

    			append(div0, t0);
    			append(div0, input1);
    			append(div2, t1);
    			append(div2, div1);
    			append(div1, button0);
    			append(div1, t3);
    			append(div1, button1);
    			append(div4, t5);
    			append(div4, div3);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.searchTerm && (input0.value !== ctx.searchTerm)) input0.value = ctx.searchTerm;

    			if (changed.gifs) {
    				each_value = ctx.gifs;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div3, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div4);
    			}

    			destroy_each(each_blocks, detaching);

    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	

      const api_key = location.search.replace("?api_key=", "") || "";
      const API_URL = `https://api.giphy.com/v1/gifs/search?api_key=${api_key}`;

      let searchTerm = "";
      let gifs = [];

      const limit = limit => `&limit=${limit}`;

      const searchGif = async () => {
        const response = await fetch(`${API_URL}${limit(15)}&q=${searchTerm}`);
        const json = await response.json();
        $$invalidate('gifs', gifs = mapResponseToGif(json.data));
      };

      const mapResponseToGif = responseData =>
        responseData.map(data => ({
          title: data.title,
          state: gifState.PAUSED,
          srcMotion: data.images.fixed_height.url,
          srcStill: data.images.fixed_height_still.url
        }));

      const playAll = () => {
        $$invalidate('gifs', gifs = gifs.map(gif => ({ ...gif, state: gifState.PLAYING })));
      };

      const pauseAll = () => {
        $$invalidate('gifs', gifs = gifs.map(gif => ({ ...gif, state: gifState.PAUSED })));
      };

    	function input0_input_handler() {
    		searchTerm = this.value;
    		$$invalidate('searchTerm', searchTerm);
    	}

    	return {
    		searchTerm,
    		gifs,
    		searchGif,
    		playAll,
    		pauseAll,
    		input0_input_handler
    	};
    }

    class Giphy extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    /* src/App.svelte generated by Svelte v3.7.1 */

    function create_fragment$2(ctx) {
    	var current;

    	var giphy = new Giphy({ $$inline: true });

    	return {
    		c: function create() {
    			giphy.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(giphy, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(giphy.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(giphy.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(giphy, detaching);
    		}
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    	}
    }

    const app = new App({
      target: document.body,
      props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
