# Roam Aliases

![](https://github.com/dive2Pro/roam-aliases/raw/master/demo.png)

## select aliases from popup window

![](https://github.com/dive2Pro/roam-aliases/raw/master/demo.gif)

## Unlinked Aliases References

https://user-images.githubusercontent.com/23192045/206823945-23c4262d-6ead-402d-ba25-4739af8ec323.mp4

## Highlight unlink aliases

<img width="767" alt="image" src="https://user-images.githubusercontent.com/23192045/210158300-046af582-380d-4bf1-ad19-c6a7b2df4da5.png">

---

# how to use

- the `Aliases::` must be placed at the 1st level block of a page to take effect.
- aliases will be split by and only by ","

## Configuration

You can customize the keyword used for aliases through the extension settings:

1. Open Roam Research
2. Go to the extension settings panel
3. Find the "Aliases" tab
4. Set your custom keyword (default is "Aliases")
5. Make sure to update the page name accordingly if you change the keyword

For example, if you set the keyword to "aliases", you should rename "Aliases" page name to "aliases"

### Case insensitive unlinked aliases

By default, "Unlinked Aliases References" matches aliases **case-sensitively** (the original behavior). If your graph mixes cases — e.g. an alias `vitamin B12` written in the page text as `Vitamin B12` — turn on the **"Case insensitive unlinked aliases"** switch in the same "Aliases" settings tab to match aliases regardless of letter case.

Note: with the switch on, very short aliases may match unintended words, since matching is no longer case-sensitive.

# todo

- [x] find unlinked aliases
- [x] keyword configuration
