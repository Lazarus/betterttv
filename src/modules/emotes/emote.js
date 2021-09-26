import html from '../../utils/html.js';

export default class Emote {
  constructor({id, category, channel, code, images, imageType = 'png', restrictionCallback = null, metadata = null}) {
    this.id = id;
    this.category = category;
    this.channel = channel;
    this.code = code;
    this.restrictionCallback = restrictionCallback;
    this.images = images;
    this.imageType = imageType;
    this.metadata = metadata;
  }

  isUsable(channel, user) {
    return this.restrictionCallback ? this.restrictionCallback(channel, user) : true;
  }

  get canonicalId() {
    const {provider} = this.category;
    if (provider == null) {
      throw new Error('cannot create canonical id from null provider');
    }
    return `${provider}-${this.id}`;
  }

  toHTML() {
    const srcset = [];
    if (this.images['2x']) {
      srcset.push(`${html.escape(this.images['2x'])} 2x`);
    }
    if (this.images['4x']) {
      srcset.push(`${html.escape(this.images['4x'])} 4x`);
    }

    const categoryClass = html.escape(this.category.id);
    const idClass = `${html.escape(this.category.id)}-emo-${html.escape(this.id)}`;
    const channelName = this.channel && (this.channel.displayName || this.channel.name);

    const balloon = `
      ${html.escape(this.code)}<br>
      ${channelName ? `Channel: ${html.escape(channelName)}<br>` : ''}
      ${html.escape(this.category.displayName)}
    `;

    return `
      &nbsp;<div class="holder">
        <div style="display: block;
        width: 30px;
        height: 30px;
        object-fit: contain;
        position: absolute;
        margin-top: -6.5px;
        margin-left: -5.5px;">    
          <img src="${html.escape(this.images['1x'])}" srcset="${srcset.join(', ')}" alt="${html.escape(
      this.code
    )}" align="top" style="position: absolute;left:0;top:0;height:30px;" />
          </div>
      </div>
    `;
  }
}
