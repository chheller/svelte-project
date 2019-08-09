<script>
  import Gif from "./Gif.svelte";
  import { gifState } from "./state.js";

  const api_key = location.search.replace("?api_key=", "") || "";
  const API_URL = `https://api.giphy.com/v1/gifs/search?api_key=${api_key}`;

  let searchTerm = "";
  let isPlayingAll = false;
  let gifs = [];

  const limit = limit => `&limit=${limit}`;

  const searchGif = async () => {
    const response = await fetch(`${API_URL}${limit(15)}&q=${searchTerm}`);
    const json = await response.json();
    gifs = mapResponseToGif(json.data);
  };

  const mapResponseToGif = responseData =>
    responseData.map(data => ({
      title: data.title,
      state: gifState.PAUSED,
      srcMotion: data.images.fixed_height.url,
      srcStill: data.images.fixed_height_still.url
    }));

  const playAll = () => {
    if (!isPlayingAll) isPlayingAll = true;
  };

  const pauseAll = () => {
    if (isPlayingAll) isPlayingAll = false;
  };
</script>

<style>
  .form-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .gifs-container {
    display: flex;
    flex-wrap: wrap;
    margin: auto;
    padding: 30px 30px;
  }
  .controls {
    padding: 5px 5px 5px 5px;
  }
</style>

<div>
  <div class="form-wrapper">
    <div>
      <input placeholder="Search for a gif" bind:value={searchTerm} />
      <input type="submit" on:click={searchGif} />
    </div>
    <div class="controls">
      <button on:click={playAll}>Play All</button>
      <button on:click={pauseAll}>Pause All</button>
    </div>
  </div>
  <div class="gifs-container">
    {#each gifs as gif, index}
      <Gif
        {gif}
        state={(isPlayingAll && gifState.PLAYING) || gif.state}
        disableHoverState={isPlayingAll}
        data-image-id={index} />
    {/each}
  </div>
</div>
