export default {
  name: 'project',
  title: 'Portfolio Project',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 2,
      description: 'Short summary for grid card (1-2 sentences)'
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 5,
      description: 'Full description for popup'
    },
    {
      name: 'link',
      title: 'Project Link',
      type: 'url',
      description: 'External project URL (optional)'
    },
    {
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first',
      initialValue: 0
    },
    {
      name: 'gallery',
      title: 'Gallery Images',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'image',
              title: 'Image',
              type: 'image',
              options: {hotspot: true}
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string'
            }
          ],
          preview: {
            select: {
              media: 'image',
              title: 'caption'
            }
          }
        }
      ],
      validation: (Rule) => Rule.min(1).max(5)
    }
  ],
  preview: {
    select: {
      title: 'title',
      media: 'gallery.0.image'
    }
  }
}
