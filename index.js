const { Client, Intents, MessageEmbed, Util } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS] });

const guildId = '';
const allowedRoles = ['Sr.Support', 'Sr.Middleman', 'Middleman', 'Admin', 'Owner', '*']; 

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error('Unable to find the specified guild.');
    return;
  }

  if (!guild.members.me.permissions.has('MANAGE_GUILD')) {
    console.error('The bot requires "Manage Guild" permission to register slash commands.');
    return;
  }

  await guild.commands.set([
    {
      name: 'mute',
      description: 'Mute a user for a specific duration.',
      options: [
        {
          name: 'user',
          type: 'USER',
          description: 'User to be muted',
          required: true,
        },
        {
          name: 'duration',
          type: 'STRING',
          description: 'Duration (e.g., 1d for one day, 1h for one hour)',
          required: true,
        },
        {
          name: 'reason',
          type: 'STRING',
          description: 'Reason for muting',
          required: false,
        },
      ],
    },
    {
      name: 'unmute',
      description: 'Remove a mute from a user.',
      options: [
        {
          name: 'user',
          type: 'USER',
          description: 'User to be unmuted',
          required: true,
        },
      ],
    }
  ]);

  console.log('Slash commands "mute" and "unmute" registered successfully.');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options, guild } = interaction;

  if (commandName === 'mute') {
    const member = interaction.member;
    const hasPermission = member.roles.cache.some(role => allowedRoles.includes(role.name)) || member.permissions.has('ADMINISTRATOR');

    if (!hasPermission) {
      return interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
    }

    const target = options.getUser('user');
    const durationString = options.getString('duration');
    const durationRegex = /^(\d+)([dhm])$/;
    const match = durationString.match(durationRegex);

    if (!match) {
      return interaction.reply({
        content: 'Invalid duration format. Please use a valid format like "1d" for one day, "1h" for one hour, or "1m" for one minute.',
        ephemeral: true,
      });
    }

    const durationValue = parseInt(match[1]);
    const durationUnit = match[2];

    let durationInMilliseconds;
    switch (durationUnit) {
      case 'd':
        durationInMilliseconds = durationValue * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        durationInMilliseconds = durationValue * 60 * 60 * 1000;
        break;
      case 'm':
        durationInMilliseconds = durationValue * 60 * 1000;
        break;
    }

    const reason = options.getString('reason') || 'No reason provided';

    try {
      const targetMember = guild.members.cache.get(target.id);
      if (!targetMember) {
        return interaction.reply({
          content: 'The user is no longer a member of the server.',
          ephemeral: true,
        });
      }

      await targetMember.timeout(durationInMilliseconds, reason);

      const embed = new MessageEmbed()
        .setColor('#ff0000')
        .setTitle('🔇 User Muted')
        .setThumbnail(target.displayAvatarURL())
        .addField('Muted User', `@${Util.escapeMarkdown(target.username)}`, true)
        .addField('Duration', `${durationValue}${durationUnit}`, true)
        .addField('Reason', reason)
        .addField('Muted By', Util.escapeMarkdown(member.toString()), true)
        .setFooter(`User ID: ${target.id}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('An error occurred while timing out the user:', error);
      return interaction.reply({
        content: 'An error occurred while timing out the user.',
        ephemeral: true,
      });
    }
  } else if (commandName === 'unmute') {
    const member = interaction.member;
    const hasPermission = member.roles.cache.some(role => allowedRoles.includes(role.name)) || member.permissions.has('ADMINISTRATOR');

    if (!hasPermission) {
        return interaction.reply({
            content: "You don't have permission to use this command.",
            ephemeral: true,
        });
    }

    const target = options.getUser('user');
    try {
        const targetMember = guild.members.cache.get(target.id);
        if (!targetMember) {
            return interaction.reply({
                content: 'The user is no longer a member of the server.',
                ephemeral: true,
            });
        }

        await targetMember.timeout(null); // Remove the timeout from the user

        const unmuteEmbed = new MessageEmbed()
            .setColor('#00ff00') // A green color to indicate success
            .setTitle('🔊 User Unmuted')
            .setDescription(`${target.username} has been successfully unmuted.`)
            .addField('Unmuted User', `@${target.username}`, true)
            .setThumbnail(target.displayAvatarURL());

        // Sending the embed in the reply
        await interaction.reply({
            embeds: [unmuteEmbed],
            ephemeral: false,
        });
    } catch (error) {
        console.error('An error occurred while removing the timeout:', error);
        return interaction.reply({
            content: 'An error occurred while trying to unmute the user.',
            ephemeral: true,
        });
    }
}

});

client.login('Token');
