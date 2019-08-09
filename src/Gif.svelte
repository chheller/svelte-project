<script>
  import { gifState } from "./state.js";
  export let gif;
  export let state = gifState.STILL;

  const handleMouseEnter = () => {
    if (state === gifState.PAUSED) state = gifState.PLAYING;
  };

  const handleMouseLeave = () => {
    if (state === gifState.PLAYING) state = gifState.PAUSED;
  };
</script>

<style>
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 250px;
    height: 250px;
    padding: 5px 5px 5px 5pxw;
    margin: auto;
  }
  .gif {
    position: relative;
    max-height: 100%;
    max-width: 100%;
    margin: auto;
  }
</style>

<div class="container">
  <img
    class="gif"
    src={state === gifState.PAUSED ? gif.srcStill : gif.srcMotion}
    alt={gif.title}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave} />
</div>
